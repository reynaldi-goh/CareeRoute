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
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [birthday, setBirthday] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // clear all local state (run on sign-out, so no stale data survives to the next user)
  const resetLocalState = () => {
    setUsername('');
    setEmail('');
    setAvatarPath(null);
    setAvatarPublicUrl(null);
    setAvatarVersion(0);
    setBirthday(null);
    setNotificationsEnabled(false);
  };

  // build public url (combine storage path + version into one cache-busted URL,
  // so every caller, initial load, post-upload — produces the same shape)
  const buildPublicUrl = (path, version) => {
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return `${data.publicUrl}?v=${version}`;
  };

  // fetch profile (load the signed-in user's profile row — username, avatar, birthday, etc.)
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

        const version = profileRow.avatar_version || 0;
        setAvatarVersion(version);

        if (profileRow.avatar_url) {
          setAvatarPath(profileRow.avatar_url);
          setAvatarPublicUrl(buildPublicUrl(profileRow.avatar_url, version));
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

  // sync with auth (load profile on sign-in, clear everything on sign-out
  // runs once on mount for the existing session, then again on every auth change)
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

  // save profile (write whichever fields are passed in to the profiles table,
  // then update local state to match — e.g. saveProfile({ username: 'new name' }))
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

  // upload avatar (send the picked photo to Storage, bump avatar_version, and
  // link both in profiles so the new photo shows immediately, not a stale cached one)
  const uploadAvatar = async (localUri) => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error('No signed-in user to save the avatar for.');

    const path = `${userId}/avatar.jpg`;
    const nextVersion = avatarVersion + 1;

    // convert file (supabase-js needs raw bytes, not a RN file:// URI, read as
    // base64, then decode to an ArrayBuffer it can actually upload)
    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, decode(base64), { contentType: 'image/jpeg', upsert: true });
    if (uploadError) throw uploadError;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: path, avatar_version: nextVersion })
      .eq('id', userId);
    if (updateError) throw updateError;

    setAvatarPath(path);
    setAvatarVersion(nextVersion);
    setAvatarPublicUrl(buildPublicUrl(path, nextVersion));

    return path;
  };

  const value = {
    username,
    email, 
    avatarPublicUrl,
    uploadAvatar,
    birthday,
    notificationsEnabled,
    loadingProfile,
    saveProfile,
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

// access context (throws early if a screen forgets to wrap itself in ProfileProvider,
// rather than failing later with a confusing "cannot read property of null")
export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used inside ProfileProvider');
  return context;
}