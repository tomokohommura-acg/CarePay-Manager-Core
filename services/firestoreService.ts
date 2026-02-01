import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  Office,
  Staff,
  MasterData,
  BusinessType,
  EvaluationRecord,
  StaffUpdateData,
  HistoryEntry,
  SmartHRConfig,
  DepartmentOfficeMapping,
  QualificationMapping,
  AppUser,
  ChangeLogEntry
} from '../types';

// コレクション名
const COLLECTIONS = {
  USERS: 'users',
  OFFICES: 'offices',
  STAFF: 'staff',
  MASTERS: 'masters',
  EVALUATION_RECORDS: 'evaluationRecords',
  INPUTS: 'inputs',
  HISTORY: 'history',
  CHANGE_LOG: 'changeLog',
  CONFIG: 'config'
} as const;

// ユーザー関連
export async function getUser(uid: string): Promise<AppUser | null> {
  const docRef = doc(db, COLLECTIONS.USERS, uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as AppUser) : null;
}

export async function getUserByEmail(email: string): Promise<AppUser | null> {
  const q = query(collection(db, COLLECTIONS.USERS), where('email', '==', email));
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : (snapshot.docs[0].data() as AppUser);
}

export async function getAllUsers(): Promise<AppUser[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.USERS));
  return snapshot.docs.map(doc => doc.data() as AppUser);
}

export async function createUser(user: AppUser): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.USERS, user.uid), user);
}

export async function updateUser(uid: string, data: Partial<AppUser>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), data);
}

export async function deleteUser(uid: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.USERS, uid));
}

// 事業所関連
export async function getAllOffices(): Promise<Office[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.OFFICES));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Office));
}

export async function saveOffices(offices: Office[]): Promise<void> {
  const batch = writeBatch(db);

  // 既存データを削除
  const existingSnapshot = await getDocs(collection(db, COLLECTIONS.OFFICES));
  existingSnapshot.docs.forEach(doc => batch.delete(doc.ref));

  // 新規データを追加
  offices.forEach(office => {
    const docRef = doc(db, COLLECTIONS.OFFICES, office.id);
    batch.set(docRef, office);
  });

  await batch.commit();
}

// 職員関連
export async function getAllStaff(): Promise<Staff[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.STAFF));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
}

export async function saveStaffList(staffList: Staff[]): Promise<void> {
  const batch = writeBatch(db);

  const existingSnapshot = await getDocs(collection(db, COLLECTIONS.STAFF));
  existingSnapshot.docs.forEach(doc => batch.delete(doc.ref));

  staffList.forEach(staff => {
    const docRef = doc(db, COLLECTIONS.STAFF, staff.id);
    batch.set(docRef, staff);
  });

  await batch.commit();
}

export async function updateStaff(staffId: string, data: Partial<Staff>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.STAFF, staffId), data);
}

// マスタデータ関連
export async function getMasters(): Promise<Record<BusinessType, MasterData> | null> {
  const docRef = doc(db, COLLECTIONS.MASTERS, 'default');
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as Record<BusinessType, MasterData>) : null;
}

export async function saveMasters(masters: Record<BusinessType, MasterData>): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.MASTERS, 'default'), masters);
}

// 評価レコード関連
export async function getEvaluationRecords(): Promise<Record<string, EvaluationRecord>> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.EVALUATION_RECORDS));
  const records: Record<string, EvaluationRecord> = {};
  snapshot.docs.forEach(doc => {
    records[doc.id] = doc.data() as EvaluationRecord;
  });
  return records;
}

export async function saveEvaluationRecords(records: Record<string, EvaluationRecord>): Promise<void> {
  const batch = writeBatch(db);

  const existingSnapshot = await getDocs(collection(db, COLLECTIONS.EVALUATION_RECORDS));
  existingSnapshot.docs.forEach(doc => batch.delete(doc.ref));

  Object.entries(records).forEach(([key, record]) => {
    const docRef = doc(db, COLLECTIONS.EVALUATION_RECORDS, key);
    batch.set(docRef, record);
  });

  await batch.commit();
}

// 入力データ関連
export async function getInputs(): Promise<Record<string, StaffUpdateData>> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.INPUTS));
  const inputs: Record<string, StaffUpdateData> = {};
  snapshot.docs.forEach(doc => {
    inputs[doc.id] = doc.data() as StaffUpdateData;
  });
  return inputs;
}

export async function saveInputs(inputs: Record<string, StaffUpdateData>): Promise<void> {
  const batch = writeBatch(db);

  const existingSnapshot = await getDocs(collection(db, COLLECTIONS.INPUTS));
  existingSnapshot.docs.forEach(doc => batch.delete(doc.ref));

  Object.entries(inputs).forEach(([key, input]) => {
    const docRef = doc(db, COLLECTIONS.INPUTS, key);
    batch.set(docRef, input);
  });

  await batch.commit();
}

export async function updateInput(key: string, data: StaffUpdateData): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.INPUTS, key), data);
}

// 履歴関連
export async function getHistory(): Promise<HistoryEntry[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.HISTORY));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HistoryEntry));
}

export async function saveHistory(history: HistoryEntry[]): Promise<void> {
  const batch = writeBatch(db);

  const existingSnapshot = await getDocs(collection(db, COLLECTIONS.HISTORY));
  existingSnapshot.docs.forEach(doc => batch.delete(doc.ref));

  history.forEach(entry => {
    const docRef = doc(db, COLLECTIONS.HISTORY, entry.id);
    batch.set(docRef, entry);
  });

  await batch.commit();
}

export async function addHistoryEntry(entry: HistoryEntry): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.HISTORY, entry.id), entry);
}

// 変更ログ関連
export async function getChangeLogs(): Promise<ChangeLogEntry[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.CHANGE_LOG));
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as ChangeLogEntry))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function addChangeLog(entry: ChangeLogEntry): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.CHANGE_LOG, entry.id), entry);
}

// 設定関連
interface ConfigData {
  smarthrConfig: SmartHRConfig;
  departmentMappings: DepartmentOfficeMapping[];
  qualificationMappings: QualificationMapping[];
  selectedPeriodId: string;
}

export async function getConfig(): Promise<ConfigData | null> {
  const docRef = doc(db, COLLECTIONS.CONFIG, 'default');
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as ConfigData) : null;
}

export async function saveConfig(config: ConfigData): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.CONFIG, 'default'), config);
}

// リアルタイムリスナー
export function subscribeToStaff(callback: (staff: Staff[]) => void): Unsubscribe {
  return onSnapshot(collection(db, COLLECTIONS.STAFF), (snapshot) => {
    const staffList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
    callback(staffList);
  });
}

export function subscribeToOffices(callback: (offices: Office[]) => void): Unsubscribe {
  return onSnapshot(collection(db, COLLECTIONS.OFFICES), (snapshot) => {
    const offices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Office));
    callback(offices);
  });
}

// 全データを一括で取得
export interface AppData {
  offices: Office[];
  staffList: Staff[];
  masters: Record<BusinessType, MasterData> | null;
  evaluationRecords: Record<string, EvaluationRecord>;
  inputs: Record<string, StaffUpdateData>;
  history: HistoryEntry[];
  changeLogs: ChangeLogEntry[];
  config: ConfigData | null;
}

export async function loadAllData(): Promise<AppData> {
  const [
    offices,
    staffList,
    masters,
    evaluationRecords,
    inputs,
    history,
    changeLogs,
    config
  ] = await Promise.all([
    getAllOffices(),
    getAllStaff(),
    getMasters(),
    getEvaluationRecords(),
    getInputs(),
    getHistory(),
    getChangeLogs(),
    getConfig()
  ]);

  return {
    offices,
    staffList,
    masters,
    evaluationRecords,
    inputs,
    history,
    changeLogs,
    config
  };
}

// LocalStorageからFirestoreへの移行
export async function migrateFromLocalStorage(): Promise<boolean> {
  const STORAGE_KEY = 'carepay_v2_state';
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) return false;

  try {
    const parsed = JSON.parse(saved);

    // 各データをFirestoreに保存
    const promises: Promise<void>[] = [];

    if (parsed.offices) {
      promises.push(saveOffices(parsed.offices));
    }
    if (parsed.staffList) {
      promises.push(saveStaffList(parsed.staffList));
    }
    if (parsed.masters) {
      promises.push(saveMasters(parsed.masters));
    }
    if (parsed.evaluationRecords) {
      promises.push(saveEvaluationRecords(parsed.evaluationRecords));
    }
    if (parsed.inputs) {
      promises.push(saveInputs(parsed.inputs));
    }
    if (parsed.history) {
      promises.push(saveHistory(parsed.history));
    }

    // 設定データをまとめて保存
    const configData: ConfigData = {
      smarthrConfig: parsed.smarthrConfig || {
        subdomain: '',
        accessToken: '',
        employmentTypeFilter: [],
        lastSyncedAt: null,
        storeToken: true
      },
      departmentMappings: parsed.departmentMappings || [],
      qualificationMappings: parsed.qualificationMappings || [],
      selectedPeriodId: parsed.selectedPeriodId || ''
    };
    promises.push(saveConfig(configData));

    await Promise.all(promises);

    // 移行完了後、LocalStorageのデータをバックアップとしてマーク
    localStorage.setItem(`${STORAGE_KEY}_migrated`, 'true');

    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}
