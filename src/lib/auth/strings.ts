import { t, type Locale } from '@/i18n/utils';
import type { AuthStrings } from '@/islands/AuthForm';

export function authStrings(locale: Locale): AuthStrings {
  const k = (key: string) => t(locale, `account.${key}`);
  return {
    loginTitle: k('loginTitle'),
    signupTitle: k('signupTitle'),
    forgotTitle: k('forgotTitle'),
    resetTitle: k('resetTitle'),
    email: k('email'),
    password: k('password'),
    name: k('name'),
    newPassword: k('newPassword'),
    passkey: k('passkey'),
    passkeyHint: k('passkeyHint'),
    or: k('or'),
    continueWith: k('continueWith'),
    signInBtn: k('signInBtn'),
    signUpBtn: k('signUpBtn'),
    sendReset: k('sendReset'),
    setPassword: k('setPassword'),
    forgotLink: k('forgotLink'),
    noAccount: k('noAccount'),
    haveAccount: k('haveAccount'),
    checkEmail: k('checkEmail'),
    resetSent: k('resetSent'),
    resetDone: k('resetDone'),
    genericError: k('genericError'),
  };
}
