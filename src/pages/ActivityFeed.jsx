import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Search, Filter } from 'lucide-react';
import OfflineSyncBanner from '@/components/OfflineSyncBanner';

export default function ActivityFeed() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadActivities();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [activities, searchTerm, filterType]);

  const loadActivities = async () => {
    try {
      const transactions = await base44.entities.Transaction.list('-created_date', 100);
      setActivities(transactions);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = activities;

    if (filterType !== 'all') {
      filtered = filtered.filter(a => a.type === filterType);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.product_name?.toLowerCase().includes(term) ||
        a.product_id?.toLowerCase().includes(term) ||
        a.reference?.toLowerCase().includes(term)
      );
    }

    setFilteredActivities(filtered);
  };

  const getActivityIcon = (type) => {
    const icons = {
      in: '📦',
      out: '📤',
      adjustment: '⚙️',
      damage: '❌',
    };
    return icons[type] || '📋';
  };

  const getActivityColor = (type) => {
    const colors = {
      in: 'border-green-200 bg-green-50',
      out: 'border-blue-200 bg-blue-50',
      adjustment: 'border-amber-200 bg-amber-50',
      damage: 'border-red-200 bg-red-50',
    };
    return colors[type] || 'border-border bg-card';
  };

  const getActivityLabel = (type) => {
    const labels = {
      in: 'Stock In',
      out: 'Stock Out',
      adjustment: 'Adjustment',
      damage: 'Damage',
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Offline Sync Banner */}
      <OfflineSyncBanner />

      {/* Header */}
      <div className="bg-primary text-white p-4 sticky top-0 z-40">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="text-xl">←</button>
          <h1 className="text-2xl font-bold">Activity Feed</h1>
        </div>
        <p className="text-sm text-primary-light ml-12">Inventory audit & transaction history</p>
      </div>

      {/* Search & Filter */}
      <div className="p-4 space-y-3 bg-card border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-foreground/40" />
          <input
            type="text"
            placeholder="Search by product, SKU, or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          <FilterButton
            label="All Activities"
            active={filterType === 'all'}
            onClick={() => setFilterType('all')}
          />
          <FilterButton
            label="Stock In"
            active={filterType === 'in'}
            onClick={() => setFilterType('in')}
            icon="📦"
          />
          <FilterButton
            label="Stock Out"
            active={filterType === 'out'}
            onClick={() => setFilterType('out')}
            icon="📤"
          />
          <FilterButton
            label="Adjustments"
            active={filterType === 'adjustment'}
            onClick={() => setFilterType('adjustment')}
            icon="⚙️"
          />
          <FilterButton
            label="Damage"
            active={filterType === 'damage'}
            onClick={() => setFilterType('damage')}
            icon="❌"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-foreground/60">Loading activity history...</p>
          </div>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="text-center py-12 px-4">
          <p className="text-4xl mb-2">📭</p>
          <p className="text-foreground/60">No activities found</p>
          {searchTerm && <p className="text-sm text-foreground/40 mt-2">Try adjusting your search</p>}
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {/* Timeline */}
          <div className="space-y-4">
            {filteredActivities.map((activity, idx) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                icon={getActivityIcon(activity.type)}
                colorClass={getActivityColor(activity.type)}
                label={getActivityLabel(activity.type)}
                isLast={idx === filteredActivities.length - 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterButton({ label, active, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
        active
          ? 'bg-primary text-white'
          : 'bg-muted text-foreground hover:bg-border'
      }`}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {label}
    </button>
  );
}

function ActivityCard({ activity, icon, colorClass, label, isLast }) {
  const createdDate = new Date(activity.created_date);
  const isToday = new Date().toDateString() === createdDate.toDateString();
  const dateLabel = isToday
    ? format(createdDate, 'HH:mm')
    : format(createdDate, 'MMM dd, HH:mm');

  return (
    <div className="relative">
      {/* Timeline Connector */}
      {!isLast && (
        <div className="absolute left-8 top-16 bottom-0 w-1 bg-border"></div>
      )}

      {/* Card */}
      <div className={`border-2 rounded-lg p-4 ${colorClass}`}>
        <div className="flex gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white/50 flex items-center justify-center text-xl relative z-10">
            {icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="font-semibold text-foreground">{activity.product_name}</p>
                <p className="text-xs text-foreground/60">{activity.product_id}</p>
              </div>
              <span className="text-xs font-medium px-2 py-1 bg-white/50 rounded text-foreground/70 whitespace-nowrap">
                {label}
              </span>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
              <div>
                <p className="text-xs text-foreground/60">Quantity</p>
                <p className="font-bold text-foreground">{activity.quantity}</p>
              </div>
              <div>
                <p className="text-xs text-foreground/60">Reference</p>
                <p className="font-bold text-foreground truncate">{activity.reference || '—'}</p>
              </div>
            </div>

            {/* Notes */}
            {activity.notes && (
              <div className="mb-3 p-2 bg-white/50 rounded text-sm text-foreground/80">
                <p className="text-xs text-foreground/60 mb-1">Notes</p>
                <p>{activity.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-foreground/60">
              <div>
                <p>By: <span className="font-medium text-foreground/80">{activity.created_by || 'System'}</span></p>
              </div>
              <div className="text-right">
                <p className="font-medium">{dateLabel}</p>
                {!isToday && <p className="text-xs">{format(createdDate, 'eee')}</p>}
              </div>
            </div>

            {/* Sync Status */}
            {activity.sync_status === 'pending' && (
              <div className="mt-2 text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded inline-block">
                ⏳ Pending sync
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}