import React, { useState, useEffect } from 'react';
import { Database, Trash2, RefreshCw, Calendar, Activity } from 'lucide-react';
import { EnrichmentCache, CachedEnrichment } from '../services/enrichmentCache';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export const CacheManagement: React.FC = () => {
  const [cacheItems, setCacheItems] = useState<CachedEnrichment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ hits: 0, misses: 0, hitRate: 0 });

  const loadCacheItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('enrichment_cache')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCacheItems(data);
      }

      const cacheStats = EnrichmentCache.getCacheStats();
      setStats(cacheStats);
    } catch (error) {
      console.error('Failed to load cache items:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCacheItems();
  }, []);

  const handleDeleteItem = async (cacheKey: string) => {
    try {
      const { error } = await supabase
        .from('enrichment_cache')
        .delete()
        .eq('cache_key', cacheKey);

      if (!error) {
        setCacheItems(prev => prev.filter(item => item.cache_key !== cacheKey));
      }
    } catch (error) {
      console.error('Failed to delete cache item:', error);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear ALL cached enrichments?')) {
      return;
    }

    try {
      await EnrichmentCache.clearAllCache();
      setCacheItems([]);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Database className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Cache Management</h3>
            <p className="text-sm text-gray-600">{cacheItems.length} cached enrichments</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={loadCacheItems}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleClearAll}
            disabled={cacheItems.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* Cache Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="h-4 w-4 text-blue-600" />
            <p className="text-xs font-medium text-blue-900">Cache Hits</p>
          </div>
          <p className="text-2xl font-bold text-blue-900">{stats.hits}</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="h-4 w-4 text-gray-600" />
            <p className="text-xs font-medium text-gray-900">Cache Misses</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.misses}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="h-4 w-4 text-green-600" />
            <p className="text-xs font-medium text-green-900">Hit Rate</p>
          </div>
          <p className="text-2xl font-bold text-green-900">{stats.hitRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Cache Items Table */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading cache...</div>
      ) : cacheItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No cached enrichments yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Industry</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Access Count</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cacheItems.map((item) => (
                <tr key={item.cache_key} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{item.domain}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.company_name || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                      {item.provider}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.industry || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    {item.success ? (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                        Success
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-gray-900 font-medium">
                    {item.access_count || 0}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => handleDeleteItem(item.cache_key)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
