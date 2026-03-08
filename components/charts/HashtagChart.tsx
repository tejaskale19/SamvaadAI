'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface HashtagChartProps {
  data: {
    hashtag: string;
    uses: number;
    avgEngagement: number;
  }[];
}

export default function HashtagChart({ data }: HashtagChartProps) {
  // Take top 8 hashtags for display
  const topHashtags = data.slice(0, 8).map((item, index) => ({
    ...item,
    displayTag: item.hashtag.length > 15 ? item.hashtag.slice(0, 15) + '...' : item.hashtag,
  }));

  const getBarColor = (engagement: number) => {
    if (engagement >= 80) return '#10B981'; // Green
    if (engagement >= 60) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={topHashtags}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis 
            type="number"
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
            domain={[0, 100]}
          />
          <YAxis 
            type="category"
            dataKey="displayTag"
            stroke="#9CA3AF"
            fontSize={11}
            tickLine={false}
            width={90}
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
              if (name === 'avgEngagement') return [`${value}%`, 'Engagement'];
              return [value, String(name)];
            }}
            labelFormatter={(label) => {
              const item = topHashtags.find(h => h.displayTag === label);
              return item?.hashtag || String(label);
            }}
          />
          <Bar 
            dataKey="avgEngagement" 
            name="Avg Engagement"
            radius={[0, 4, 4, 0]}
          >
            {topHashtags.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.avgEngagement)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
