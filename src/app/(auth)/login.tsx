import { PrimaryGradient } from '@/components/PrimaryGradient';
import { useLanguage, useTranslation } from '@/hooks/use-language';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/useAuth';
import { useResponsive } from '@/hooks/useResponsive';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircle, Eye, EyeOff, Globe } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const insets = useSafeAreaInsets();
  const themeColors = useTheme();
  const { t, isRTL } = useTranslation();
  const { language, toggleLanguage } = useLanguage();
  const { signIn } = useAuth();
  const { isDesktop, isTablet } = useResponsive();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const passwordInput = useRef<TextInput>(null);

  const handleLogin = async () => {
    setErrorMessage(null);
    if (!email.trim() || !password.trim()) {
      setErrorMessage(isRTL ? 'تکایە ئیمەیڵ و تێپەڕەوشەکەت بنووسە.' : 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    let formattedEmail = email.trim();
    const { error } = await signIn(formattedEmail, password);
    setLoading(false);
    if (error) {
      setErrorMessage(error);
    } else {
      router.replace(redirect === '/adminpanel' ? '/adminpanel' : '/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: themeColors.background, paddingTop: insets.top }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          (isDesktop || isTablet) && styles.scrollContentCentered,
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={[styles.authCard, (isDesktop || isTablet) && styles.authCardDesktop]}>
          {/* 🌐 Top Right Language Switcher on First Screen */}
          <View style={{ width: '100%', alignItems: 'flex-end', marginBottom: 12 }}>
            <Pressable
              onPress={toggleLanguage}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: themeColors.backgroundElement,
                borderColor: '#00D2FF',
                borderWidth: 1,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
              }}
            >
              <Globe size={14} color="#00D2FF" />
              <Text style={{ color: '#00D2FF', fontSize: 12, fontWeight: '700' }}>
                {language === 'ku' ? 'کوردی (سۆرانی)' : 'English (EN)'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.header}>
            <Image
              source={require('../../../assets/images/icon.png')}
              style={styles.brandLogoImage}
              resizeMode="contain"
            />
            <Text style={styles.brandTitle}>
              ANI<Text style={{ color: themeColors.primary }}>FLIX</Text>
            </Text>
            <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
              {t('signInToAccount', 'Sign in to continue watching')}
            </Text>
          </View>

          {errorMessage && (
            <View style={styles.errorBox}>
              <AlertCircle color="#ff4d4d" size={20} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.form}>
            <TextInput
              style={[styles.input, { backgroundColor: themeColors.backgroundElement, color: themeColors.text }, isRTL && { textAlign: 'right' }]}
              placeholder={t('email', 'Email or Username')}
              placeholderTextColor={themeColors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={(val) => {
                setEmail(val);
                if (errorMessage) setErrorMessage(null);
              }}
              editable={!loading}
              returnKeyType="next"
              onSubmitEditing={() => passwordInput.current?.focus()}
              blurOnSubmit={false}
            />
            <View style={[styles.passwordWrapper, { backgroundColor: themeColors.backgroundElement }]}>
              <TextInput
                ref={passwordInput}
                style={[styles.passwordInput, { color: themeColors.text }, isRTL && { textAlign: 'right' }]}
                placeholder={t('password', 'Password')}
                secureTextEntry={!showPassword}
                placeholderTextColor={themeColors.textSecondary}
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                editable={!loading}
                returnKeyType="go"
                onSubmitEditing={() => void handleLogin()}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showPassword ? (
                  <EyeOff size={20} color={themeColors.textSecondary} />
                ) : (
                  <Eye size={20} color={themeColors.textSecondary} />
                )}
              </Pressable>
            </View>
            <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotBtn}>
              <Text style={[styles.forgotText, { color: themeColors.textSecondary }]}>
                {t('forgotPassword', 'Forgot Password?')}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.button, { backgroundColor: themeColors.primary, opacity: loading ? 0.7 : 1, overflow: 'hidden' }]}
              onPress={handleLogin}
              disabled={loading}
            >
              <PrimaryGradient borderRadius={12} />
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{t('signInBtn', 'Sign In')}</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={{ color: themeColors.textSecondary }}>
              {t('dontHaveAccount', "Don't have an account?")}{' '}
            </Text>
            <Pressable onPress={() => router.push('/(auth)/signup')}>
              <Text style={{ color: themeColors.primary, fontWeight: 'bold' }}>
                {t('createAccount', 'Sign Up')}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  scrollContentCentered: {
    alignItems: 'center',
  },
  authCard: {
    width: '100%',
  },
  authCardDesktop: {
    maxWidth: 440,
    padding: 32,
    borderRadius: 20,
    backgroundColor: 'rgba(18, 18, 26, 0.75)',
    borderWidth: 1,
    borderColor: '#242436',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brandLogoImage: {
    width: 68,
    height: 68,
    borderRadius: 18,
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#381010',
    borderColor: '#ff4d4d',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#ff9999',
    fontSize: 14,
    flex: 1,
  },
  form: {
    gap: 16,
  },
  input: {
    height: 52,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#242436',
  },
  passwordWrapper: {
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#242436',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 15,
  },
  eyeButton: {
    paddingHorizontal: 14,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    height: 52,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
});
