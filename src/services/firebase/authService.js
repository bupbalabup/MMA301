import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
} from 'firebase/auth';

import { auth } from './firebaseConfig';

function createAuthError(action, error) {
  const messages = {
    'auth/email-already-in-use': 'Email này đã được sử dụng.',
    'auth/invalid-email': 'Địa chỉ email không hợp lệ.',
    'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
    'auth/user-not-found': 'Email hoặc mật khẩu không đúng.',
    'auth/wrong-password': 'Email hoặc mật khẩu không đúng.',
    'auth/user-disabled': 'Tài khoản này đã bị vô hiệu hóa.',
    'auth/weak-password': 'Mật khẩu phải có ít nhất 6 ký tự.',
    'auth/network-request-failed': 'Không thể kết nối. Vui lòng kiểm tra Internet.',
    'auth/too-many-requests': 'Có quá nhiều yêu cầu. Vui lòng thử lại sau.',
    'auth/user-token-expired': 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    'auth/requires-recent-login': 'Vui lòng xác nhận mật khẩu trước khi thực hiện thao tác này.',
  };

  if (!error?.code && error instanceof Error && error.message) {
    return error;
  }

  return new Error(messages[error?.code] ?? `Không thể ${action}. Vui lòng thử lại.`);
}

export async function registerWithEmail(email, password) {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    return credential.user;
  } catch (error) {
    throw createAuthError('tạo tài khoản', error);
  }
}

export async function loginWithEmail(email, password) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  } catch (error) {
    throw createAuthError('đăng nhập', error);
  }
}

export async function reauthenticateWithPassword(password) {
  const user = auth.currentUser;

  if (!user?.email) {
    throw new Error('Không tìm thấy phiên đăng nhập hiện tại.');
  }

  try {
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    return user;
  } catch (error) {
    throw createAuthError('xác nhận mật khẩu', error);
  }
}

export async function changeCurrentUserPassword(currentPassword, newPassword) {
  try {
    const user = await reauthenticateWithPassword(currentPassword);
    await updatePassword(user, newPassword);
    return user;
  } catch (error) {
    throw createAuthError('đổi mật khẩu', error);
  }
}

export async function deleteCurrentUserAuthentication() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Không tìm thấy phiên đăng nhập hiện tại.');
  }

  try {
    await deleteUser(user);
  } catch (error) {
    throw createAuthError('xóa tài khoản đăng nhập', error);
  }
}

export async function updateCurrentUserDisplayName(displayName) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Không tìm thấy phiên đăng nhập hiện tại.');
  }

  try {
    await updateProfile(user, { displayName: displayName || null });
    return user;
  } catch (error) {
    throw createAuthError('cập nhật tên hiển thị', error);
  }
}

export async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    throw createAuthError('đăng xuất', error);
  }
}

export function getCurrentUser() {
  return auth.currentUser;
}

export function subscribeToAuthChanges(callback) {
  try {
    return onAuthStateChanged(auth, callback);
  } catch (error) {
    throw createAuthError('theo dõi trạng thái đăng nhập', error);
  }
}
