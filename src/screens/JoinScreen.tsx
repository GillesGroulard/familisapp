import React, { useState, useEffect } from 'react';
import { Settings, Copy, Check, Users, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { FamilySettingsMenu } from '../components/FamilySettingsMenu';

interface JoinScreenProps {
  onSuccess?: () => void;
}

interface Family {
  id: string;
  name: string;
  display_name: string;
  join_code: string;
  family_picture?: string;
  slideshow_photo_limit: number;
  slideshow_speed: number;
}

interface FamilyMember {
  id: string;
  name: string;
  avatar_url?: string;
  added_at: string;
}

export const JoinScreen: React.FC<JoinScreenProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'join' | 'create' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [members, setMembers] = useState<Record<string, FamilyMember[]>>({});
  const [copied, setCopied] = useState(false);
  
  const [familyName, setFamilyName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [color, setColor] = useState('#056aa0');
  const [joinCode, setJoinCode] = useState('');
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetchFamilies();
  }, []);

  const fetchFamilies = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: familyData, error: familyError } = await supabase
        .from('family_members')
        .select(`
          families (
            id,
            name,
            display_name,
            join_code,
            family_picture,
            slideshow_photo_limit,
            slideshow_speed
          )
        `)
        .eq('user_id', user.id);

      if (familyError) throw familyError;

      const userFamilies = familyData.map(item => ({
        ...item.families,
        display_name: item.families.display_name || item.families.name
      }));

      setFamilies(userFamilies);

      // Fetch members for each family
      for (const family of userFamilies) {
        const { data: membersData, error: membersError } = await supabase
          .from('family_members')
          .select(`
            users (
              id,
              name,
              avatar_url
            ),
            added_at
          `)
          .eq('family_id', family.id);

        if (membersError) throw membersError;

        setMembers(prev => ({
          ...prev,
          [family.id]: membersData.map(member => ({
            id: member.users.id,
            name: member.users.name,
            avatar_url: member.users.avatar_url,
            added_at: member.added_at
          }))
        }));
      }
    } catch (err) {
      console.error('Error fetching families:', err);
      setError(err instanceof Error ? err.message : 'Failed to load families');
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const join_code = Array.from(
        { length: 8 },
        () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
      ).join('');

      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .insert([
          { 
            name: familyName,
            display_name: displayName || familyName,
            color,
            join_code,
            slideshow_photo_limit: 30,
            slideshow_speed: 15
          }
        ])
        .select()
        .single();

      if (familyError) throw familyError;

      const { error: memberError } = await supabase
        .from('family_members')
        .insert([
          { 
            family_id: familyData.id,
            user_id: user.id
          }
        ]);

      if (memberError) throw memberError;

      setSuccess('Family created successfully!');
      onSuccess?.();
      setMode(null);
      fetchFamilies();
    } catch (err) {
      console.error('Error creating family:', err);
      setError(err instanceof Error ? err.message : 'Failed to create family');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .select()
        .eq('join_code', joinCode)
        .single();

      if (familyError) throw new Error('Invalid family code');

      const { data: existingMember, error: memberCheckError } = await supabase
        .from('family_members')
        .select()
        .eq('family_id', familyData.id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) throw new Error('You are already a member of this family');

      const { error: joinError } = await supabase
        .from('family_members')
        .insert([
          { 
            family_id: familyData.id,
            user_id: user.id
          }
        ]);

      if (joinError) throw joinError;

      setSuccess('Successfully joined family!');
      onSuccess?.();
      setMode(null);
      fetchFamilies();
    } catch (err) {
      console.error('Error joining family:', err);
      setError(err instanceof Error ? err.message : 'Failed to join family');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsClick = (familyId: string) => {
    setSelectedFamilyId(familyId);
    setShowSettings(true);
  };

  const handleSettingsClose = () => {
    setSelectedFamilyId(null);
    setShowSettings(false);
  };

  const handleSettingsUpdate = () => {
    fetchFamilies();
  };

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        {mode === null ? (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                Join Your Family
              </h2>
              <p className="text-gray-600">
                Connect with your family members and share moments together
              </p>
            </div>

            {families.length > 0 && (
              <div className="mb-8 space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Your Families
                </h3>
                {families.map(family => (
                  <div key={family.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {family.family_picture ? (
                          <img
                            src={family.family_picture}
                            alt={family.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-primary-600" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-medium text-gray-800">
                            {family.display_name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {members[family.id]?.length || 0} members
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSettingsClick(family.id)}
                          className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-200"
                          title="Family Settings"
                        >
                          <Settings className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleCopyCode(family.join_code)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors"
                        >
                          {copied ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                          <span className="font-medium">{family.join_code}</span>
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {members[family.id]?.map(member => (
                        <div
                          key={member.id}
                          className="flex items-center gap-2 p-2 bg-white rounded-lg"
                        >
                          {member.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt={member.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <Users className="w-4 h-4 text-gray-600" />
                            </div>
                          )}
                          <span className="text-sm font-medium text-gray-700">
                            {member.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={() => setMode('create')}
                className="w-full flex items-center justify-center gap-3 p-4 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
              >
                <Users className="w-5 h-5" />
                <span className="font-medium">Create a New Family</span>
              </button>
              <button
                onClick={() => setMode('join')}
                className="w-full flex items-center justify-center gap-3 p-4 bg-white text-primary-600 border-2 border-primary-600 rounded-xl hover:bg-primary-50 transition-colors"
              >
                <UserPlus className="w-5 h-5" />
                <span className="font-medium">Join Existing Family</span>
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={mode === 'create' ? handleCreateFamily : handleJoinFamily}>
            <button
              type="button"
              onClick={() => setMode(null)}
              className="text-gray-600 hover:text-gray-800 mb-6"
            >
              ← Back
            </button>

            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              {mode === 'create' ? 'Create a New Family' : 'Join a Family'}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg">
                {success}
              </div>
            )}

            {mode === 'create' ? (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Family Name
                    </label>
                    <input
                      type="text"
                      value={familyName}
                      onChange={(e) => setFamilyName(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter your family name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="How you want to see this family listed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Family Color
                    </label>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full h-12 p-1 border border-gray-300 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Family Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter the family code"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? 'Processing...'
                : mode === 'create'
                ? 'Create Family'
                : 'Join Family'}
            </button>
          </form>
        )}
      </div>

      {showSettings && selectedFamilyId && (
        <FamilySettingsMenu
          familyId={selectedFamilyId}
          currentPhotoLimit={families.find(f => f.id === selectedFamilyId)?.slideshow_photo_limit || 30}
          currentSpeed={families.find(f => f.id === selectedFamilyId)?.slideshow_speed || 15}
          onUpdate={handleSettingsUpdate}
          onClose={handleSettingsClose}
        />
      )}
    </div>
  );
};