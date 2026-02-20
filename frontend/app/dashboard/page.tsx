'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, Platform, PublishJob } from '@/lib/api';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [history, setHistory] = useState<PublishJob[]>([]);
  const [content, setContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email: string; id: string; picture?: string } | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!api.isAuthenticated()) {
      router.push('/login');
      return;
    }

    // Get user data
    const currentUser = api.getCurrentUser();
    setUser(currentUser);

    // Check if just connected a platform
    if (searchParams?.get('connected') === 'true') {
      setSuccess('Platform connected successfully!');
      setTimeout(() => setSuccess(''), 3000);
    }

    loadData();
  }, [router, searchParams]);

  const loadData = async () => {
    try {
      const [platformsData, historyData] = await Promise.all([
        api.getConnectedPlatforms(),
        api.getPublishHistory()
      ]);
      setPlatforms(platformsData);
      setHistory(historyData);

      // Auto-select all connected platforms
      setSelectedPlatforms(platformsData.map(p => p.name));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platformName: string) => {
    try {
      const { authUrl } = await api.getConnectUrl(platformName);
      window.location.href = authUrl;
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || selectedPlatforms.length === 0) return;

    setPublishing(true);
    setError('');
    setSuccess('');

    try {
      await api.publish(content, selectedPlatforms);
      setSuccess('Published successfully! Content is being distributed...');
      setContent('');
      setTimeout(() => {
        loadData();
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPublishing(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    router.push('/');
  };

  const handleDisconnect = async (platformName: string) => {
    setDisconnecting(platformName);
    setError('');
    setSuccess('');

    try {
      await api.disconnectPlatform(platformName);
      setSuccess(`${platformName} disconnected successfully!`);
      setShowDisconnectConfirm(null);

      // Reload platforms and clear selected platforms
      await loadData();
      setSelectedPlatforms([]);

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDisconnecting(null);
    }
  };

  const togglePlatform = (platformName: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformName)
        ? prev.filter(p => p !== platformName)
        : [...prev, platformName]
    );
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'processing': return 'text-blue-600 bg-blue-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'failed': case 'partial_failure': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-purple-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Prasaran
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.email}
                    className="w-8 h-8 rounded-full shadow-sm"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-white font-semibold text-sm">
                      {user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="hidden sm:block text-sm">
                  <div className="font-semibold text-gray-800">{user.email.split('@')[0]}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Platforms */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-purple-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Connected Platforms</h2>

              {platforms.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm mb-4">No platforms connected yet</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleConnect('Manch')}
                      className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200"
                    >
                      Connect Manch
                    </button>
                    <button
                      onClick={() => handleConnect('Adda')}
                      className="w-full py-3 px-4 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200"
                    >
                      Connect Adda
                    </button>
                    <button
                      onClick={() => handleConnect('Samooh')}
                      className="w-full py-3 px-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200"
                    >
                      Connect Samooh
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {platforms.map((platform) => (
                    <div key={platform.id} className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-sm">
                            <span className="text-white font-bold text-lg">
                              {platform.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">{platform.name}</div>
                            <div className="flex items-center gap-1 text-xs text-green-600">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Connected
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowDisconnectConfirm(platform.name)}
                          className="px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 font-medium"
                        >
                          Disconnect
                        </button>
                      </div>

                      {/* Disconnect Confirmation */}
                      {showDisconnectConfirm === platform.name && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-800 mb-3">
                            Are you sure you want to disconnect {platform.name}? This will revoke access and delete your connection.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDisconnect(platform.name)}
                              disabled={disconnecting === platform.name}
                              className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
                            >
                              {disconnecting === platform.name ? (
                                <span className="flex items-center justify-center gap-2">
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  Disconnecting...
                                </span>
                              ) : (
                                'Yes, Disconnect'
                              )}
                            </button>
                            <button
                              onClick={() => setShowDisconnectConfirm(null)}
                              disabled={disconnecting === platform.name}
                              className="flex-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add platform buttons */}
                  <div className="space-y-2">
                    {!platforms.some(p => p.name === 'Manch') && (
                      <button
                        onClick={() => handleConnect('Manch')}
                        className="w-full py-2 px-4 bg-white hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 text-indigo-700 font-semibold rounded-xl border-2 border-indigo-200 hover:border-indigo-300 transition-all duration-200 text-sm"
                      >
                        + Connect Manch
                      </button>
                    )}
                    {!platforms.some(p => p.name === 'Adda') && (
                      <button
                        onClick={() => handleConnect('Adda')}
                        className="w-full py-2 px-4 bg-white hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 text-teal-700 font-semibold rounded-xl border-2 border-teal-200 hover:border-teal-300 transition-all duration-200 text-sm"
                      >
                        + Connect Adda
                      </button>
                    )}
                    {!platforms.some(p => p.name === 'Samooh') && (
                      <button
                        onClick={() => handleConnect('Samooh')}
                        className="w-full py-2 px-4 bg-white hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 text-orange-700 font-semibold rounded-xl border-2 border-orange-200 hover:border-orange-300 transition-all duration-200 text-sm"
                      >
                        + Connect Samooh
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Publisher & History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Composer */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-purple-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Compose & Publish</h2>

              {success && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {success}
                </div>
              )}

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {platforms.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <p className="text-gray-600">Connect a platform first to start publishing</p>
                </div>
              ) : (
                <form onSubmit={handlePublish}>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What would you like to share?"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition"
                    rows={4}
                    maxLength={500}
                  />
                  <div className="mt-4 flex flex-wrap justify-between items-center gap-3">
                    <div className="flex gap-2 flex-wrap">
                      {platforms.map((platform) => (
                        <button
                          key={platform.id}
                          type="button"
                          onClick={() => togglePlatform(platform.name)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                            selectedPlatforms.includes(platform.name)
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {platform.name}
                        </button>
                      ))}
                    </div>
                    <button
                      type="submit"
                      disabled={publishing || !content.trim() || selectedPlatforms.length === 0}
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {publishing ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Publishing...
                        </span>
                      ) : (
                        'Publish'
                      )}
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`text-sm font-medium ${content.length > 450 ? 'text-red-500' : 'text-gray-500'}`}>
                      {content.length}/500
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm text-gray-500">
                      Publishing to {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </form>
              )}
            </div>

            {/* Publishing History */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-purple-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Publishing History</h2>
                {history.length > 0 && (
                  <span className="text-sm text-gray-500 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                    {history.length} {history.length === 1 ? 'item' : 'items'}
                  </span>
                )}
              </div>

              {history.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No publishing history yet</h3>
                  <p className="text-gray-600">Your published content will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.slice(0, 10).map((job) => (
                    <div key={job.job_id} className="p-4 bg-gradient-to-r from-purple-50/50 to-pink-50/50 rounded-xl border border-purple-100 hover:shadow-md transition-all duration-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="text-gray-800 line-clamp-2 leading-relaxed">{job.content}</p>
                        </div>
                        <span className={`ml-3 px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusColor(job.job_status || 'pending')}`}>
                          {job.job_status || 'pending'}
                        </span>
                      </div>
                      {job.platforms && job.platforms.length > 0 && (
                        <div className="mb-2 flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-500">Published to:</span>
                          {job.platforms.map((platform: any, idx: number) => (
                            <span
                              key={idx}
                              className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                                platform.status === 'completed'
                                  ? 'bg-green-100 text-green-700'
                                  : platform.status === 'failed'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {platform.name}
                              {platform.status === 'completed' && (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                              {platform.status === 'failed' && (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatDate(job.created_at || Date.now())}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
