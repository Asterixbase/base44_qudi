/**
 * useReminderScheduler
 * Runs on mount (e.g. in Dashboard) to auto-fire due reminders.
 * Logs each fired reminder to the Notification entity.
 * Uses localStorage to avoid re-firing reminders already sent today.
 */
import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { computePendingReminders, buildReminderMessage } from '../lib/reminderScheduler';

const STORAGE_KEY = 'qudi_fired_reminders';

function getTodayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getFiredKeys() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function markFired(key) {
  const map = getFiredKeys();
  map[key] = getTodayKey();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function alreadyFiredToday(key) {
  const map = getFiredKeys();
  return map[key] === getTodayKey();
}

export default function useReminderScheduler() {
  const [summary, setSummary] = useState({ fired: 0, skipped: 0, done: false });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const circles = await base44.entities.Circle.filter({ status: 'active' });
      if (!circles.length) { setSummary(s => ({ ...s, done: true })); return; }

      const membersByCircle = {};
      await Promise.all(circles.map(async c => {
        membersByCircle[c.id] = await base44.entities.Member.filter({ circle_id: c.id });
      }));

      const pending = computePendingReminders(circles, membersByCircle);
      let fired = 0, skipped = 0;

      for (const r of pending) {
        const key = `${r.circle.id}__${r.member.id}__${r.tier}`;
        if (alreadyFiredToday(key)) { skipped++; continue; }

        const message = buildReminderMessage(r.member, r.circle, r.tier);
        await base44.entities.Notification.create({
          circle_id:   r.circle.id,
          member_id:   r.member.id,
          member_name: r.member.full_name,
          phone:       r.member.phone || 'N/A',
          message,
          status:  'sent',
          channel: 'in-app',
        });

        markFired(key);
        fired++;
      }

      if (!cancelled) setSummary({ fired, skipped, done: true });
    }

    run();
    return () => { cancelled = true; };
  }, []);

  return summary;
}