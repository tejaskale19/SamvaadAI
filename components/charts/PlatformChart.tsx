'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { Platform } from '../../types';

interface PlatformChartProps {
  data: {
    platform: Platform;
    posts: number;
    avgEngagement: number;
    totalReach: number;
    totalLikes: number;
  }[];
}

const PLATFORM_COLORS: Record<Platform, string> = {
  instagram: '#E1306C',
  twitter: '#1DA1F2',
  linkedin: '#0077B5',
  facebook: '#4267B2',
};

const PLATFORM_NAMES: Record<Platform, string> = {
  instagram: 'Instagram',
  twitter: 'Twitter',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
};

export default function PlatformChart({ data }: PlatformChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    name: PLATFORM_NAMES[item.platform],
    color: PLATFORM_COLORS[item.platform],
  }));

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={formattedData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis 
            dataKey="name" 
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
          />
          <YAxis 
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
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
              if (name === 'posts') return [value, 'Posts'];
              return [value, String(name)];
            }}
          />
          <Legend />
          <Bar 
            dataKey="posts" 
            name="Posts" 
            radius={[4, 4, 0, 0]}
          >
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} opacity={0.8} />
            ))}
          </Bar>
          <Bar 
            dataKey="avgEngagement" 
            name="Avg Engagement %" 
            radius={[4, 4, 0, 0]}
          >
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
