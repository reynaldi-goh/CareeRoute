import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../API/supabaseClient';

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(''); // read-only — comes from auth.users via the session, not profiles
  const [avatarPath, setAvatarPath] = useState(null); // storage path, e.g. "<user_id>/avatar.jpg"
  const [avatarPublicUrl, setAvatarPublicUrl] = useState(null); // derived, displayable URL
  const [birthday, setBirthday] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const resetLocalState = () => {
    setUsername('');
    setEmail('');
    setAvatarPath(null);
    setAvatarPublicUrl(null);
    setBirthday(null);
    setNotificationsEnabled(false);
  };

  const loadProfileForUser = useCallback(async (userId, userEmail) => {
    setLoadingProfile(true);
    try {
      setEmail(userEmail || '');

      const { data: profileRow, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;

      if (profileRow) {
        setUsername(profileRow.username || '');
        setBirthday(profileRow.birthday ? new Date(profileRow.birthday) : null);
        setNotificationsEnabled(!!profileRow.notifications_enabled);

        if (profileRow.avatar_url) {
          setAvatarPath(profileRow.avatar_url);
          const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(profileRow.avatar_url);
          setAvatarPublicUrl(publicUrlData.publicUrl);
        } else {
          setAvatarPath(null);
          setAvatarPublicUrl(null);
        }
      }
    } catch (err) {
      console.log('loadProfileForUser error:', err.message);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfileForUser(session.user.id, session.user.email);
      } else {
        setLoadingProfile(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        loadProfileForUser(session.user.id, session.user.email);
      } else if (event === 'SIGNED_OUT') {
        resetLocalState();
        setLoadingProfile(false);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [loadProfileForUser]);

  // Saves whichever fields are passed in to the profiles table, and updates local state to match.
  // e.g. saveProfile({ username: 'new name' }) or saveProfile({ notificationsEnabled: true })
  const saveProfile = async (updates) => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error('No signed-in user to save the profile for.');

    const dbUpdates = {};
    if ('username' in updates) dbUpdates.username = updates.username;
    if ('birthday' in updates) {
      dbUpdates.birthday = updates.birthday ? updates.birthday.toISOString().slice(0, 10) : null;
    }
    if ('notificationsEnabled' in updates) dbUpdates.notifications_enabled = updates.notificationsEnabled;

    const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', userId);
    if (error) throw error;

    if ('username' in updates) setUsername(updates.username);
    if ('birthday' in updates) setBirthday(updates.birthday);
    if ('notificationsEnabled' in updates) setNotificationsEnabled(updates.notificationsEnabled);
  };

  // Uploads the picked photo to Storage and links it in profiles.avatar_url.
  const uploadAvatar = async (localUri) => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error('No signed-in user to save the avatar for.');

    const path = `${userId}/avatar.jpg`;

    // supabase-js needs raw bytes, not a RN file:// URI — read as base64, then decode to an ArrayBuffer
    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, decode(base64), { contentType: 'image/jpeg', upsert: true });
    if (uploadError) throw uploadError;

    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: path }).eq('id', userId);
    if (updateError) throw updateError;

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
    setAvatarPath(path);
    // cache-bust so a re-upload of the same filename shows immediately instead of a stale cached image
    setAvatarPublicUrl(`${publicUrlData.publicUrl}?t=${Date.now()}`);

    return path;
  };

  const value = {
    username,
    email, // read-only for now
    avatarPublicUrl,
    uploadAvatar,
    birthday,
    notificationsEnabled,
    loadingProfile,
    saveProfile,
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used inside ProfileProvider');
  return context;
}