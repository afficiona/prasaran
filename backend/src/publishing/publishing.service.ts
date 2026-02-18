import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ManchAdapter } from '../platforms/manch-adapter.service';
import { AddaAdapter } from '../platforms/adda-adapter.service';
import { SamoohAdapter } from '../platforms/samooh-adapter.service';
import { randomUUID } from 'crypto';

@Injectable()
export class PublishingService {
  private processingQueue: Set<string> = new Set();

  constructor(
    private databaseService: DatabaseService,
    private manchAdapter: ManchAdapter,
    private addaAdapter: AddaAdapter,
    private samoohAdapter: SamoohAdapter,
  ) {
    // Start processing queue
    this.processQueue();
  }

  async createPublishJob(userId: string, content: string, platformNames: string[]) {
    const db = this.databaseService.getDb();

    // Create post
    const postId = randomUUID();
    db.prepare(`
      INSERT INTO posts (id, user_id, content, created_at)
      VALUES (?, ?, ?, ?)
    `).run(postId, userId, content, Date.now());

    // Create publish job
    const jobId = randomUUID();
    db.prepare(`
      INSERT INTO publish_jobs (id, post_id, status, created_at)
      VALUES (?, ?, 'pending', ?)
    `).run(jobId, postId, Date.now());

    // Create tasks for each platform
    for (const platformName of platformNames) {
      const platform = db.prepare('SELECT * FROM platforms WHERE name = ?').get(platformName) as any;

      if (platform) {
        const taskId = randomUUID();
        db.prepare(`
          INSERT INTO publish_tasks (id, job_id, platform_id, status, created_at)
          VALUES (?, ?, ?, 'pending', ?)
        `).run(taskId, jobId, platform.id, Date.now());
      }
    }

    return {
      jobId,
      postId,
      status: 'pending',
    };
  }

  async getPublishHistory(userId: string) {
    const db = this.databaseService.getDb();

    const jobs = db.prepare(`
      SELECT
        pj.id as job_id,
        pj.status as job_status,
        pj.created_at,
        p.id as post_id,
        p.content
      FROM publish_jobs pj
      JOIN posts p ON pj.post_id = p.id
      WHERE p.user_id = ?
      ORDER BY pj.created_at DESC
      LIMIT 50
    `).all(userId) as any[];

    // For each job, get the platforms it was published to
    return jobs.map(job => {
      const tasks = db.prepare(`
        SELECT pl.name as platform_name, pt.status
        FROM publish_tasks pt
        JOIN platforms pl ON pt.platform_id = pl.id
        WHERE pt.job_id = ?
      `).all(job.job_id) as any[];

      return {
        ...job,
        platforms: tasks.map(t => ({
          name: t.platform_name,
          status: t.status
        }))
      };
    });
  }

  async getJobStatus(jobId: string) {
    const db = this.databaseService.getDb();

    const job = db.prepare('SELECT * FROM publish_jobs WHERE id = ?').get(jobId) as any;

    if (!job) {
      throw new Error('Job not found');
    }

    const tasks = db.prepare(`
      SELECT pt.*, pl.name as platform_name
      FROM publish_tasks pt
      JOIN platforms pl ON pt.platform_id = pl.id
      WHERE pt.job_id = ?
    `).all(jobId);

    return {
      jobId: job.id,
      status: job.status,
      tasks,
    };
  }

  private async processQueue() {
    setInterval(async () => {
      await this.processPendingTasks();
    }, 2000); // Process every 2 seconds
  }

  private async processPendingTasks() {
    const db = this.databaseService.getDb();

    // Get pending tasks
    const tasks = db.prepare(`
      SELECT pt.*, po.user_id, po.content, pl.name as platform_name
      FROM publish_tasks pt
      JOIN publish_jobs pj ON pt.job_id = pj.id
      JOIN posts po ON pj.post_id = po.id
      JOIN platforms pl ON pt.platform_id = pl.id
      WHERE pt.status = 'pending' AND pt.attempt_count < 3
      LIMIT 10
    `).all() as any[];

    for (const task of tasks) {
      if (this.processingQueue.has(task.id)) {
        continue;
      }

      this.processingQueue.add(task.id);

      // Process task asynchronously
      this.processTask(task).finally(() => {
        this.processingQueue.delete(task.id);
      });
    }
  }

  private async processTask(task: any) {
    const db = this.databaseService.getDb();

    try {
      // Mark as processing
      db.prepare(`
        UPDATE publish_tasks
        SET status = 'processing', attempt_count = attempt_count + 1
        WHERE id = ?
      `).run(task.id);

      // Publish to platform
      let externalPostId: string;

      if (task.platform_name === 'Manch') {
        const result = await this.manchAdapter.publishContent(task.user_id, task.content);
        externalPostId = result.externalPostId;
      } else if (task.platform_name === 'Adda') {
        const result = await this.addaAdapter.publishContent(task.user_id, task.content);
        externalPostId = result.externalPostId;
      } else if (task.platform_name === 'Samooh') {
        const result = await this.samoohAdapter.publishContent(task.user_id, task.content);
        externalPostId = result.externalPostId;
      } else {
        throw new Error(`Unsupported platform: ${task.platform_name}`);
      }

      // Mark as completed
      db.prepare(`
        UPDATE publish_tasks
        SET status = 'completed', external_post_id = ?
        WHERE id = ?
      `).run(externalPostId, task.id);

      // Check if all tasks for this job are completed
      this.updateJobStatus(task.job_id);

    } catch (error) {
      // Mark as failed
      db.prepare(`
        UPDATE publish_tasks
        SET status = 'failed', last_error = ?
        WHERE id = ?
      `).run((error as Error).message, task.id);

      this.updateJobStatus(task.job_id);
    }
  }

  private updateJobStatus(jobId: string) {
    const db = this.databaseService.getDb();

    const tasks = db.prepare('SELECT status FROM publish_tasks WHERE job_id = ?').all(jobId) as any[];

    const allCompleted = tasks.every(t => t.status === 'completed');
    const anyFailed = tasks.some(t => t.status === 'failed');

    let jobStatus = 'processing';
    if (allCompleted) {
      jobStatus = 'completed';
    } else if (anyFailed) {
      jobStatus = 'partial_failure';
    }

    db.prepare('UPDATE publish_jobs SET status = ? WHERE id = ?').run(jobStatus, jobId);
  }
}
