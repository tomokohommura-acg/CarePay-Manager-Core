/**
 * Firebase/Firestore モック
 * テスト時にFirebase依存を分離するためのモック実装
 */

import { vi } from 'vitest';

// Firebase Auth モック
export const mockUser = {
  uid: 'test-user-001',
  email: 'test@example.com',
  displayName: 'テストユーザー',
  photoURL: null
};

export const mockAuth = {
  currentUser: mockUser,
  onAuthStateChanged: vi.fn((callback) => {
    callback(mockUser);
    return vi.fn(); // unsubscribe
  }),
  signInWithPopup: vi.fn().mockResolvedValue({ user: mockUser }),
  signOut: vi.fn().mockResolvedValue(undefined)
};

export const mockGoogleProvider = {};

// Firestore モック
export const mockFirestore = {
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn()
};

// モックデータストア
let mockDataStore: Record<string, Record<string, any>> = {};

export const resetMockDataStore = () => {
  mockDataStore = {};
};

export const setMockData = (collection: string, id: string, data: any) => {
  if (!mockDataStore[collection]) {
    mockDataStore[collection] = {};
  }
  mockDataStore[collection][id] = data;
};

export const getMockData = (collection: string, id: string) => {
  return mockDataStore[collection]?.[id] || null;
};

export const getAllMockData = (collection: string) => {
  return Object.entries(mockDataStore[collection] || {}).map(([id, data]) => ({
    id,
    ...data
  }));
};

// Firestore関数モック
export const mockGetDoc = vi.fn((docRef: any) => {
  const { collection, id } = docRef;
  const data = getMockData(collection, id);
  return Promise.resolve({
    exists: () => data !== null,
    data: () => data,
    id
  });
});

export const mockGetDocs = vi.fn((queryRef: any) => {
  const { collection } = queryRef;
  const docs = getAllMockData(collection);
  return Promise.resolve({
    docs: docs.map(doc => ({
      id: doc.id,
      data: () => doc,
      exists: () => true
    })),
    forEach: (callback: (doc: any) => void) => {
      docs.forEach(doc => callback({
        id: doc.id,
        data: () => doc
      }));
    }
  });
});

export const mockSetDoc = vi.fn((docRef: any, data: any) => {
  const { collection, id } = docRef;
  setMockData(collection, id, data);
  return Promise.resolve();
});

// Firebase初期化モック
export const mockInitializeApp = vi.fn();
export const mockGetAuth = vi.fn(() => mockAuth);
export const mockGetFirestore = vi.fn(() => mockFirestore);

// vi.mock用のファクトリー関数
export const createFirebaseMocks = () => ({
  initializeApp: mockInitializeApp,
  getAuth: mockGetAuth,
  getFirestore: mockGetFirestore,
  GoogleAuthProvider: vi.fn(() => mockGoogleProvider),
  signInWithPopup: mockAuth.signInWithPopup,
  signOut: mockAuth.signOut,
  onAuthStateChanged: mockAuth.onAuthStateChanged,
  collection: mockFirestore.collection,
  doc: mockFirestore.doc,
  getDoc: mockGetDoc,
  getDocs: mockGetDocs,
  setDoc: mockSetDoc,
  updateDoc: mockFirestore.updateDoc,
  deleteDoc: mockFirestore.deleteDoc,
  onSnapshot: mockFirestore.onSnapshot
});
