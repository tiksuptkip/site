'use client';
import React from 'react';
import { AdminPage } from '../../src/pages/AdminPage';
import { DEFAULT_SITE_SETTINGS } from '../../src/services/siteService';

export default function AdminRoutePage() {
  return (
    <AdminPage
      siteSettings={DEFAULT_SITE_SETTINGS}
      lang="en"
      onLanguageChange={() => {}}
      onNavigateHome={() => {
        if (typeof window !== 'undefined') window.location.href = '/';
      }}
    />
  );
}
