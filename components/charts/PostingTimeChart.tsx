'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface PostingTimeChartProps {
  data: {
    hour: number;
    posts: number;
    avgEngagement: number;
  }[];
}

export default function PostingTimeChart({ data }: PostingTimeChartProps) {
  // Fill in missing hours with 0 values
  const fullDayData = Array.from({ length: 24 }, (_, hour) => {
    const existing = data.find(d => d.hour === hour);
    return {
      hour,
      displayTime: hour === 0 ? '12 AM' : 
                   hour < 12 ? `${hour} AM` : 
                   hour === 12 ? '12 PM' : 
                   `${hour - 12} PM`,
      posts: existing?.posts || 0,
      avgEngagement: existing?.avgEngagement || 0,
    };
  });

  // Find peak hours (top 3 by engagement)
  const sortedByEngagement = [...fullDayData].sort((a, b) => b.avgEngagement - a.avgEngagement);
  const peakHours = new Set(sortedByEngagement.slice(0, 3).map(d => d.hour));

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={fullDayData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis 
            dataKey="displayTime"
            stroke="#9CA3AF"
            fontSize={10}
            tickLine={false}
            interval={2}
          />
          <YAxis 
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F9FAFB',
            }}
            labelStyle={{ color: '#9CA3AF' }}
            formatter={(value, name) => {
              if (name === 'avgEngagement') return [`${value}%`, 'Avg Engagement'];
              return [value, String(name)];
            }}
          />
          <Area
            type="monotone"
            dataKey="avgEngagement"
            name="Avg Engagement"
            stroke="#8B5CF6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorEngagement)"
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Peak Hours Legend */}
      <div className="mt-4 flex items-center justify-center space-x-4 text-sm">
        <span className="text-slate-400">Best posting times:</span>
        {sortedByEngagement.slice(0, 3).filter(d => d.avgEngagement > 0).map((d, i) => (
          <span 
            key={d.hour}
            className="px-2 py-1 rounded bg-purple-500/20 text-purple-400 font-medium"
          >
            {d.displayTime} ({d.avgEngagement}%)
          </span>
        ))}
      </div>
    </div>
  );
}
