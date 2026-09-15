import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Camera, Save } from 'lucide-react-native';
import { router } from 'expo-router';
import { BG_GRADIENT, BG_DARK, GOLD_PRIMARY, GOLD_SOFT_FILL, GOLD_MEDIUM_FILL, GOLD_MEDIUM_BORDER } from '@/lib/theme';
import * as ImagePicker from 'expo-image-picker';

import { getUser, setUser, subscribeUser } from '@/store/userStore';
import { useTranslation } from '@/hooks/useTranslation';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const UPLOAD_BUCKET = 'driver-photos';

type DriverRole = 'driver' | 'passenger' | null;

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const [role, setRole] = useState<DriverRole>(getUser().role);
  const [loading, setLoading] = useState(false);

  // form values
  const [firstName, setFirstName] = useState(getUser().firstName);
  const [lastName, setLastName] = useState(getUser().lastName);
  const [phone, setPhone] = useState(getUser().phone);

  const [carName, setCarName] = useState('');
  const [carNumber, setCarNumber] = useState('');
  const [carColor, setCarColor] = useState('');

  const [avatarPreviewUri, setAvatarPreviewUri] = useState<string | null>(null);
  const [avatarRemoteUrl, setAvatarRemoteUrl] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeUser(() => {
      const u = getUser();
      setRole(u.role);
      setFirstName(u.firstName);
      setLastName(u.lastName);
      setPhone(u.phone);
    });
    return unsub;
  }, []);

  const fullName = useMemo(() => {
    const fn = firstName.trim();
    const ln = lastName.trim();
    return [fn, ln].filter(Boolean).join(' ') || '—';
  }, [firstName, lastName]);

  const fetchDriverProfile = async () => {
    try {
      if (!getUser().phone) return;

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/users?phone=eq.${encodeURIComponent(getUser().phone)}&select=avatar_url,car_name,car_number,car_color,first_name,last_name,phone,role`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!res.ok) throw new Error('Failed to load profile');
      const rows = (await res.json()) as any[];
      const row = rows?.[0];
      if (!row) return;

      setUser({
        firstName: row.first_name || row.firstName || firstName,
        lastName: row.last_name || row.lastName || lastName,
        phone: row.phone || phone,
        role: row.role || role,
      });

      const avatar_url = row.avatar_url ?? null;
      setAvatarRemoteUrl(avatar_url);
      setAvatarPreviewUri(avatar_url);

      setCarName(row.car_name || '');
      setCarNumber(row.car_number || '');
      setCarColor(row.car_color || '');
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDriverProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestPickPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('menuEditProfile.permissionTitle'), t('menuEditProfile.permissionMessage'));
      return false;
    }
    return true;
  };

  const uploadAvatarToStorage = async (localUri: string) => {
    const res = await fetch(localUri);
    const blob = await res.blob();

    const fileExt = localUri.split('.').pop()?.toLowerCase() || 'jpg';
    const objectName = `${getUser().phone || 'user'}-${Date.now()}.${fileExt}`;

    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${UPLOAD_BUCKET}/${objectName}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': (blob as any).type || 'image/jpeg',
          'x-upsert': 'true',
        },
        body: blob,
      }
    );

    if (!uploadRes.ok) {
      const txt = await uploadRes.text().catch(() => '');
      throw new Error(`Upload failed: ${txt}`);
    }

    // Bucket should allow public read.
    return `${SUPABASE_URL}/storage/v1/object/public/${UPLOAD_BUCKET}/${objectName}`;
  };

  const handlePickAvatar = async () => {
    const ok = await requestPickPermission();
    if (!ok) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled) return;

    const uri = (result.assets?.[0]?.uri ?? null) as string | null;
    if (!uri) return;

    setAvatarPreviewUri(uri);

    try {
      setLoading(true);
      const remoteUrl = await uploadAvatarToStorage(uri);
      setAvatarRemoteUrl(remoteUrl);
    } catch (e: any) {
      console.error(e);
      Alert.alert(t('menuEditProfile.errorTitle'), `${t('menuEditProfile.errorPhotoUpload')}: ${e?.message || 'unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    if (!firstName.trim()) return t('menuEditProfile.errorFirstNameRequired');
    if (!lastName.trim()) return t('menuEditProfile.errorLastNameRequired');
    if (!phone.trim()) return t('menuEditProfile.errorPhoneRequired');

    if (role === 'driver') {
      if (!carName.trim()) return t('menuEditProfile.errorCarNameRequired');
      if (!carNumber.trim()) return t('menuEditProfile.errorCarNumberRequired');
      if (!carColor.trim()) return t('menuEditProfile.errorCarColorRequired');
    }

    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      Alert.alert(t('menuEditProfile.warningTitle'), err);
      return;
    }

    try {
      setLoading(true);

      const updateBody: Record<string, any> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      };

      if (role === 'driver') {
        updateBody.car_name = carName.trim();
        updateBody.car_number = carNumber.trim();
        updateBody.car_color = carColor.trim();
      }

      if (avatarRemoteUrl) {
        updateBody.avatar_url = avatarRemoteUrl;
      }

      const originalPhone = getUser().phone;
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/users?phone=eq.${encodeURIComponent(
          originalPhone || phone.trim()
        )}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(updateBody),
        }
      );

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || 'Update failed');
      }

      setUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        role: role || getUser().role,
      });

      Alert.alert(t('menuEditProfile.successTitle'), t('menuEditProfile.successMessage'));
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert(t('menuEditProfile.errorTitle'), t('menuEditProfile.errorSaveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={BG_GRADIENT} style={styles.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} activeOpacity={0.7}>
          <ChevronLeft size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('menuEditProfile.headerTitle')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.avatarRow}>
          <View style={styles.avatarWrap}>
            {avatarPreviewUri ? (
              <Image source={{ uri: avatarPreviewUri }} style={styles.avatarImg} />
            ) : (
              <Image
                source={require('@/assets/images/icon.png')}
                style={styles.avatarImgFallback}
              />
            )}
          </View>

          <TouchableOpacity
            style={styles.pickPhotoBtn}
            activeOpacity={0.8}
            onPress={handlePickAvatar}
          >
            <Camera size={18} color="#FFFFFF" />
            <Text style={styles.pickPhotoText}>{t('menuEditProfile.uploadPhoto')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>{t('menuEditProfile.personalSection')}</Text>

        <View style={styles.inputGrid}>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder={t('menuEditProfile.firstNamePlaceholder')}
            placeholderTextColor="rgba(255,255,255,0.35)"
          />
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder={t('menuEditProfile.lastNamePlaceholder')}
            placeholderTextColor="rgba(255,255,255,0.35)"
          />
        </View>

        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder={t('menuEditProfile.phonePlaceholder')}
            placeholderTextColor="rgba(255,255,255,0.35)"
            keyboardType="phone-pad"
          />
        </View>

        {role === 'driver' ? (
          <>
            <Text style={styles.sectionLabel}>{t('menuEditProfile.driverSection')}</Text>

            <View style={styles.inputCard}>
              <TextInput
                style={styles.input}
                value={carName}
                onChangeText={setCarName}
                placeholder={t('menuEditProfile.carNamePlaceholder')}
                placeholderTextColor="rgba(255,255,255,0.35)"
              />
            </View>

            <View style={styles.inputCard}>
              <TextInput
                style={styles.input}
                value={carNumber}
                onChangeText={setCarNumber}
                placeholder={t('menuEditProfile.carNumberPlaceholder')}
                placeholderTextColor="rgba(255,255,255,0.35)"
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputCard}>
              <TextInput
                style={styles.input}
                value={carColor}
                onChangeText={setCarColor}
                placeholder={t('menuEditProfile.carColorPlaceholder')}
                placeholderTextColor="rgba(255,255,255,0.35)"
              />
            </View>
          </>
        ) : null}

        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={[styles.button, styles.cancelBtn]}
            onPress={handleCancel}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text style={[styles.buttonText, styles.cancelText]}>{t('menuEditProfile.cancelButton')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.saveBtn]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.saveRow}>
                <Save size={18} color="#FFFFFF" />
                <Text style={styles.buttonText}>{t('menuEditProfile.saveButton')}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.hintText}>{fullName}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bg: { ...StyleSheet.absoluteFillObject },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  avatarRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: GOLD_PRIMARY,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarImgFallback: { width: '100%', height: '100%' },
  pickPhotoBtn: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: GOLD_SOFT_FILL,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GOLD_MEDIUM_BORDER,
  },
  pickPhotoText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 12,
  },
  inputGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  inputCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    paddingVertical: Platform.select({ ios: 14, android: 12, default: 12 }),
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    marginBottom: 10,
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cancelText: {
    color: 'rgba(255,255,255,0.7)',
  },
  saveBtn: {
    backgroundColor: GOLD_PRIMARY,
    borderColor: GOLD_PRIMARY,
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  hintText: {
    marginTop: 18,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.35)',
    fontFamily: 'Inter-Regular',
    fontSize: 12,
  },
});

