import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveLayout,
  ResponsiveGrid,
  ResponsiveFlex,
  ResponsiveContainer,
  TouchOptimizedButton,
  TouchOptimizedCard,
  TouchOptimizedInput,
  TouchOptimizedSelect,
  MobileNavigation,
  MobileHeader,
  MobileDrawer,
  AdaptiveImage,
  ResponsiveImageGrid,
} from './ui';
import { useDeviceDetection } from '../hooks/useDeviceDetection';
import { useAdaptiveLoading } from '../hooks/useAdaptiveLoading';

export const MobileOptimizationDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formData, setFormData] = useState({
    pnr: '',
    name: '',
    category: 'general',
  });

  const deviceInfo = useDeviceDetection();
  const { config, networkSpeed, getAnimationConfig } = useAdaptiveLoading();

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
        </svg>
      ),
    },
    {
      id: 'pnrs',
      label: 'PNRs',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      badge: 3,
    },
    {
      id: 'notifications',
      label: 'Alerts',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
        </svg>
      ),
      badge: 2,
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  const sampleImages = [
    { src: '/api/placeholder/300/200', alt: 'Train Station 1' },
    { src: '/api/placeholder/300/200', alt: 'Train Station 2' },
    { src: '/api/placeholder/300/200', alt: 'Train Station 3' },
    { src: '/api/placeholder/300/200', alt: 'Train Station 4' },
    { src: '/api/placeholder/300/200', alt: 'Train Station 5' },
    { src: '/api/placeholder/300/200', alt: 'Train Station 6' },
  ];

  const categoryOptions = [
    { value: 'general', label: 'General' },
    { value: 'express', label: 'Express' },
    { value: 'local', label: 'Local' },
    { value: 'premium', label: 'Premium' },
  ];

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
  };

  return (
    <ResponsiveLayout className="bg-background min-h-screen">
      {/* Mobile Header */}
      <MobileHeader
        title="PNR Tracker"
        leftAction={{
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          ),
          onClick: () => setIsDrawerOpen(true),
          label: 'Open menu',
        }}
        rightActions={[
          {
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            ),
            onClick: () => console.log('Search clicked'),
            label: 'Search',
          },
          {
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
              </svg>
            ),
            onClick: () => console.log('Notifications clicked'),
            label: 'Notifications',
            badge: 5,
          },
        ]}
      />

      {/* Main Content */}
      <ResponsiveContainer className={deviceInfo.isMobile ? 'pt-16 pb-20' : 'py-8'}>
        {/* Device Info Card */}
        <TouchOptimizedCard className="mb-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-contrast">Device Information</h2>
            <ResponsiveGrid cols={{ xs: 1, sm: 2, lg: 3 }} gap={4}>
              <div className="space-y-2">
                <h3 className="font-medium text-contrast">Screen</h3>
                <p className="text-sm text-contrast-secondary">
                  Size: {deviceInfo.screenSize} ({deviceInfo.isMobile ? 'Mobile' : deviceInfo.isTablet ? 'Tablet' : 'Desktop'})
                </p>
                <p className="text-sm text-contrast-secondary">
                  Orientation: {deviceInfo.orientation}
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-contrast">Capabilities</h3>
                <p className="text-sm text-contrast-secondary">
                  Touch: {deviceInfo.touchSupport ? 'Yes' : 'No'}
                </p>
                <p className="text-sm text-contrast-secondary">
                  Network: {deviceInfo.connectionType} ({networkSpeed})
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-contrast">Performance</h3>
                <p className="text-sm text-contrast-secondary">
                  Memory: {deviceInfo.deviceMemory}GB
                </p>
                <p className="text-sm text-contrast-secondary">
                  CPU Cores: {deviceInfo.hardwareConcurrency}
                </p>
              </div>
            </ResponsiveGrid>
          </div>
        </TouchOptimizedCard>

        {/* Adaptive Loading Config */}
        <TouchOptimizedCard className="mb-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-contrast">Adaptive Loading Configuration</h2>
            <ResponsiveGrid cols={{ xs: 1, sm: 2 }} gap={4}>
              <div className="space-y-2">
                <h3 className="font-medium text-contrast">Optimizations</h3>
                <ul className="text-sm text-contrast-secondary space-y-1">
                  <li>Image Optimization: {config.enableImageOptimization ? '✓' : '✗'}</li>
                  <li>Lazy Loading: {config.enableLazyLoading ? '✓' : '✗'}</li>
                  <li>Code Splitting: {config.enableCodeSplitting ? '✓' : '✗'}</li>
                  <li>Prefetching: {config.enablePrefetching ? '✓' : '✗'}</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-contrast">Settings</h3>
                <ul className="text-sm text-contrast-secondary space-y-1">
                  <li>Max Requests: {config.maxConcurrentRequests}</li>
                  <li>Image Quality: {config.imageQuality}</li>
                  <li>Animations: {config.animationLevel}</li>
                </ul>
              </div>
            </ResponsiveGrid>
          </div>
        </TouchOptimizedCard>

        {/* Touch-Optimized Form */}
        <TouchOptimizedCard className="mb-6">
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <h2 className="text-xl font-semibold text-contrast">Add New PNR</h2>
            
            <TouchOptimizedInput
              label="PNR Number"
              placeholder="Enter 10-digit PNR"
              value={formData.pnr}
              onChange={(e) => setFormData({ ...formData, pnr: e.target.value })}
              maxLength={10}
            />

            <TouchOptimizedInput
              label="Passenger Name"
              placeholder="Enter passenger name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <TouchOptimizedSelect
              label="Train Category"
              options={categoryOptions}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />

            <ResponsiveFlex justify="end" className="pt-4">
              <TouchOptimizedButton type="submit" variant="primary">
                Add PNR
              </TouchOptimizedButton>
            </ResponsiveFlex>
          </form>
        </TouchOptimizedCard>

        {/* Responsive Image Grid */}
        <TouchOptimizedCard className="mb-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-contrast">Station Gallery</h2>
            <ResponsiveImageGrid
              images={sampleImages}
              columns={{ xs: 1, sm: 2, md: 3, lg: 4 }}
              gap={4}
            />
          </div>
        </TouchOptimizedCard>

        {/* Sample PNR Cards */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-contrast">Recent PNRs</h2>
          <ResponsiveGrid cols={{ xs: 1, sm: 2, lg: 3 }} gap={4}>
            {[1, 2, 3, 4, 5, 6].map((id) => (
              <TouchOptimizedCard
                key={id}
                interactive
                hapticFeedback
                onTap={() => console.log(`PNR ${id} tapped`)}
                className="cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-contrast">PNR {id}234567890</h3>
                      <p className="text-sm text-contrast-secondary">Mumbai → Delhi</p>
                    </div>
                    <span className="px-2 py-1 bg-success/10 text-success text-xs rounded-full">
                      Confirmed
                    </span>
                  </div>
                  <div className="text-sm text-contrast-secondary">
                    <p>Train: 12345 - Express Train</p>
                    <p>Date: {new Date().toLocaleDateString()}</p>
                    <p>Seat: A1, 23</p>
                  </div>
                </div>
              </TouchOptimizedCard>
            ))}
          </ResponsiveGrid>
        </div>
      </ResponsiveContainer>

      {/* Mobile Navigation */}
      <MobileNavigation
        items={navigationItems}
        activeItem={activeTab}
        onItemSelect={(item) => setActiveTab(item.id)}
      />

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Menu"
        position="left"
      >
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-contrast">Navigation</h3>
            {navigationItems.map((item) => (
              <TouchOptimizedButton
                key={item.id}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  setActiveTab(item.id);
                  setIsDrawerOpen(false);
                }}
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
                {item.badge && (
                  <span className="ml-auto bg-error text-white text-xs px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </TouchOptimizedButton>
            ))}
          </div>
          
          <div className="border-t border-default pt-4">
            <h3 className="font-semibold text-contrast mb-2">Settings</h3>
            <TouchOptimizedButton variant="ghost" className="w-full justify-start">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Preferences
            </TouchOptimizedButton>
            <TouchOptimizedButton variant="ghost" className="w-full justify-start">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Help & Support
            </TouchOptimizedButton>
          </div>
        </div>
      </MobileDrawer>
    </ResponsiveLayout>
  );
};