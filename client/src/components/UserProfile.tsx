import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { User, UpdateUserProfile } from '@shared/schema';

interface UserProfileProps {
  onBack?: () => void;
}

export function UserProfile({ onBack }: UserProfileProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current user profile
  const { data: profile, isLoading } = useQuery<User>({
    queryKey: ['/api/profile'],
  });

  // State for form data
  const [formData, setFormData] = useState<Partial<UpdateUserProfile>>({});
  const [heightFeet, setHeightFeet] = useState<number>(5);
  const [heightInches, setHeightInches] = useState<number>(9);

  // Populate form when profile data loads
  React.useEffect(() => {
    if (profile) {
      // Convert height from cm to feet/inches if needed
      const heightCm = profile.height || 175;
      const feet = Math.floor(heightCm / 30.48);
      const inches = Math.round((heightCm / 2.54) % 12);
      
      setHeightFeet(feet);
      setHeightInches(inches);
      
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: profile.email || '',
        dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : '',
        gender: profile.gender || 'male',
        height: heightCm,
        targetWeight: profile.targetWeight || 70,
        activityLevel: profile.activityLevel || 'moderately_active',
        stepGoal: profile.stepGoal || 10000,
        calorieGoal: profile.calorieGoal || 1000,
        sleepGoal: profile.sleepGoal || 480,
        units: profile.units || 'metric'
      });
    }
  }, [profile]);

  // Update height feet/inches when units change
  React.useEffect(() => {
    if (formData.units === 'imperial' && formData.height) {
      const heightCm = formData.height;
      const totalInches = heightCm / 2.54;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      setHeightFeet(feet);
      setHeightInches(inches);
    }
  }, [formData.units, formData.height]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateUserProfile) => {
      return await apiRequest('PUT', '/api/profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/health-metrics'] }); // Refresh dashboard data
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been saved successfully!',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Convert birthdate to age and dateOfBirth
    const submitData = {
      ...formData,
      age: formData.dateOfBirth ? calculateAge(formData.dateOfBirth as string) : undefined,
      dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth as string) : undefined
    } as UpdateUserProfile;
    updateProfileMutation.mutate(submitData);
  };

  const handleChange = (field: keyof UpdateUserProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleHeightChange = () => {
    if (formData.units === 'imperial') {
      // Convert feet + inches to cm
      const totalInches = (heightFeet * 12) + heightInches;
      const cm = totalInches * 2.54;
      setFormData(prev => ({ ...prev, height: cm }));
    }
  };

  const calculateAge = (birthdate: string): number => {
    if (!birthdate) return 0;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (isLoading) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <div className="text-white">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen px-4 pt-8 pb-24">
      {/* Header */}
      <div className="flex items-center mb-8">
        {onBack && (
          <Button onClick={onBack} variant="ghost" className="mr-4 text-white">
            ← Back
          </Button>
        )}
        <h1 className="text-white font-work font-bold text-2xl uppercase tracking-wide">
          Personal Info
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-6">
          <h3 className="text-white font-work font-bold text-lg mb-4">Basic Information</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="firstName" className="text-gray-300 text-sm mb-2 block">First Name</Label>
              <Input
                id="firstName"
                type="text"
                value={formData.firstName || ''}
                onChange={(e) => handleChange('firstName', e.target.value)}
                className="bg-[#2A2A2A] border-gray-700 text-white"
                placeholder="Enter first name"
              />
            </div>
            <div>
              <Label htmlFor="lastName" className="text-gray-300 text-sm mb-2 block">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                value={formData.lastName || ''}
                onChange={(e) => handleChange('lastName', e.target.value)}
                className="bg-[#2A2A2A] border-gray-700 text-white"
                placeholder="Enter last name"
              />
            </div>
          </div>

          <div className="mb-4">
            <Label htmlFor="email" className="text-gray-300 text-sm mb-2 block">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              className="bg-[#2A2A2A] border-gray-700 text-white"
              placeholder="Enter email address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dateOfBirth" className="text-gray-300 text-sm mb-2 block">
                Date of Birth {formData.dateOfBirth && `(Age: ${calculateAge(formData.dateOfBirth as string)})`}
              </Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth || ''}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                className="bg-[#2A2A2A] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label htmlFor="gender" className="text-gray-300 text-sm mb-2 block">Gender</Label>
              <Select value={formData.gender} onValueChange={(value) => handleChange('gender', value)}>
                <SelectTrigger className="bg-[#2A2A2A] border-gray-700 text-white">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent className="bg-[#2A2A2A] border-gray-700">
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Physical Characteristics */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-6">
          <h3 className="text-white font-work font-bold text-lg mb-4">Physical Information</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="height" className="text-gray-300 text-sm mb-2 block">
                Height ({formData.units === 'metric' ? 'cm' : 'ft/in'})
              </Label>
              {formData.units === 'metric' ? (
                <Input
                  id="height"
                  type="number"
                  value={formData.height || ''}
                  onChange={(e) => handleChange('height', parseFloat(e.target.value))}
                  className="bg-[#2A2A2A] border-gray-700 text-white"
                  placeholder="175"
                />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Input
                      type="number"
                      min="3"
                      max="8"
                      value={heightFeet}
                      onChange={(e) => {
                        const feet = parseInt(e.target.value);
                        setHeightFeet(feet);
                        setTimeout(handleHeightChange, 0);
                      }}
                      className="bg-[#2A2A2A] border-gray-700 text-white"
                      placeholder="5"
                    />
                    <Label className="text-gray-400 text-xs mt-1 block">ft</Label>
                  </div>
                  <div>
                    <Input
                      type="number"
                      min="0"
                      max="11"
                      value={heightInches}
                      onChange={(e) => {
                        const inches = parseInt(e.target.value);
                        setHeightInches(inches);
                        setTimeout(handleHeightChange, 0);
                      }}
                      className="bg-[#2A2A2A] border-gray-700 text-white"
                      placeholder="9"
                    />
                    <Label className="text-gray-400 text-xs mt-1 block">in</Label>
                  </div>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="targetWeight" className="text-gray-300 text-sm mb-2 block">
                Target Weight ({formData.units === 'metric' ? 'kg' : 'lbs'})
              </Label>
              <Input
                id="targetWeight"
                type="number"
                step="0.1"
                value={formData.targetWeight || ''}
                onChange={(e) => handleChange('targetWeight', parseFloat(e.target.value))}
                className="bg-[#2A2A2A] border-gray-700 text-white"
                placeholder={formData.units === 'metric' ? '70' : '154'}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="activityLevel" className="text-gray-300 text-sm mb-2 block">Activity Level</Label>
            <Select value={formData.activityLevel} onValueChange={(value) => handleChange('activityLevel', value)}>
              <SelectTrigger className="bg-[#2A2A2A] border-gray-700 text-white">
                <SelectValue placeholder="Select activity level" />
              </SelectTrigger>
              <SelectContent className="bg-[#2A2A2A] border-gray-700">
                <SelectItem value="sedentary">Sedentary (little/no exercise)</SelectItem>
                <SelectItem value="lightly_active">Lightly Active (light exercise 1-3 days/week)</SelectItem>
                <SelectItem value="moderately_active">Moderately Active (moderate exercise 3-5 days/week)</SelectItem>
                <SelectItem value="very_active">Very Active (hard exercise 6-7 days/week)</SelectItem>
                <SelectItem value="extra_active">Extra Active (very hard exercise, physical job)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Goals & Targets */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-6">
          <h3 className="text-white font-work font-bold text-lg mb-4">Daily Goals</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="stepGoal" className="text-gray-300 text-sm mb-2 block">Daily Step Goal</Label>
              <Input
                id="stepGoal"
                type="number"
                value={formData.stepGoal || ''}
                onChange={(e) => handleChange('stepGoal', parseInt(e.target.value))}
                className="bg-[#2A2A2A] border-gray-700 text-white"
                placeholder="10000"
              />
            </div>
            
            <div>
              <Label htmlFor="calorieGoal" className="text-gray-300 text-sm mb-2 block">Daily Calorie Burn Goal</Label>
              <Input
                id="calorieGoal"
                type="number"
                value={formData.calorieGoal || ''}
                onChange={(e) => handleChange('calorieGoal', parseInt(e.target.value))}
                className="bg-[#2A2A2A] border-gray-700 text-white"
                placeholder="1000"
              />
            </div>
            
            <div>
              <Label htmlFor="sleepGoal" className="text-gray-300 text-sm mb-2 block">Sleep Goal (hours)</Label>
              <Input
                id="sleepGoal"
                type="number"
                step="0.5"
                min="6"
                max="12"
                value={formData.sleepGoal ? formData.sleepGoal / 60 : ''}
                onChange={(e) => handleChange('sleepGoal', parseFloat(e.target.value) * 60)}
                className="bg-[#2A2A2A] border-gray-700 text-white"
                placeholder="8"
              />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-6">
          <h3 className="text-white font-work font-bold text-lg mb-4">Preferences</h3>
          
          <div>
            <Label htmlFor="units" className="text-gray-300 text-sm mb-2 block">Units</Label>
            <Select value={formData.units} onValueChange={(value) => handleChange('units', value)}>
              <SelectTrigger className="bg-[#2A2A2A] border-gray-700 text-white">
                <SelectValue placeholder="Select units" />
              </SelectTrigger>
              <SelectContent className="bg-[#2A2A2A] border-gray-700">
                <SelectItem value="metric">Metric (kg, cm)</SelectItem>
                <SelectItem value="imperial">Imperial (lbs, ft/in)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Save Button */}
        <Button 
          type="submit" 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
          disabled={updateProfileMutation.isPending}
        >
          {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
        </Button>
      </form>
    </div>
  );
}