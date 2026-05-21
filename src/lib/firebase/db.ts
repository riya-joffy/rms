import { User, MarketReport, ActivityLog, Notification, DashboardStats } from '../../types';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';

// Helper to determine if real Firebase is configured
const isFirebaseActive = (): boolean => {
  if (typeof window === 'undefined') return false;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  return !!apiKey && apiKey !== 'YOUR_API_KEY_HERE';
};

// ==========================================
// 1. Initial Mock / Seed Data
// ==========================================

const ALLOWED_USER_EMAILS = ['riyajoffy1@gmail.com', 'zandrakanja@gmail.com'];

const DEFAULT_USERS: User[] = [
  {
    id: 'A-101',
    name: 'Riya Joffy',
    email: 'riyajoffy1@gmail.com',
    role: 'admin',
    department: 'Operations',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    status: 'active',
    lastActive: '2026-05-21T15:27:00Z',
  },
  {
    id: 'S-201',
    name: 'Zandra Kanja',
    email: 'zandrakanja@gmail.com',
    role: 'staff',
    department: 'Market Analysis',
    region: 'North America',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    status: 'active',
    lastActive: '2026-05-21T15:30:00Z',
  }
];

const DEFAULT_REPORTS: MarketReport[] = [
  {
    id: 'REP-2026-001',
    date: '2026-05-20',
    time: '14:30',
    staffName: 'Zandra Kanja',
    staffId: 'S-201',
    department: 'Market Analysis',
    status: 'Approved',
    activityType: 'Hospital Visit',
    meetingType: 'Physical',
    institutionName: 'City General Hospital',
    location: 'Boston, MA',
    finalYearStudentsCount: 120,
    headOfInstitution: 'Dr. Sarah Connor',
    contactNumber: '+1 555-0199',
    spocName: 'John Smith',
    spocContact: '+1 555-0188',
    spocEmail: 'jsmith@cityhospital.org',
    notes: 'Conducted a physical walkthrough and presentation. Spoke to final year medical students. High level of interest in operational programs. Recommended immediate follow-up contract dispatch.',
    dateTime: '2026-05-20T10:00',
    feedback: 'Excellent work Zandra. Program dispatched and pilot schedule approved.',
    attachments: [
      { id: 'att-1', name: 'hospital_presentation.pdf', size: '2.4 MB', type: 'application/pdf', url: '#' }
    ],
    history: [
      { id: 'h-11', status: 'Pending', date: '2026-05-20T14:45:00Z', comment: 'Submitted visit report.', user: 'Zandra Kanja' },
      { id: 'h-12', status: 'Approved', date: '2026-05-20T17:30:00Z', comment: 'Approved, program dispatched.', user: 'Riya Joffy' }
    ]
  },
  {
    id: 'REP-2026-002',
    date: '2026-05-21',
    time: '09:15',
    staffName: 'Zandra Kanja',
    staffId: 'S-201',
    department: 'Market Analysis',
    status: 'Pending',
    activityType: 'Institution Visit',
    meetingType: 'Virtual',
    institutionName: 'State Medical University',
    location: 'New York, NY',
    finalYearStudentsCount: 250,
    headOfInstitution: 'Dean Arthur Pendelton',
    contactNumber: '+1 555-0211',
    spocName: 'Elena Rostova',
    spocContact: '+1 555-0212',
    spocEmail: 'erostova@statemed.edu',
    notes: 'Virtual seminar conducted on RMS procedures. Over 200 medical students attended and filled the feedback. Requesting onboarding details for final year candidates.',
    dateTime: '2026-05-21T08:00',
    attachments: [],
    history: [
      { id: 'h-21', status: 'Pending', date: '2026-05-21T09:30:00Z', comment: 'Submitted for university review.', user: 'Zandra Kanja' }
    ]
  },
  {
    id: 'REP-2026-003',
    date: '2026-05-21',
    time: '11:00',
    staffName: 'Zandra Kanja',
    staffId: 'S-201',
    department: 'Market Analysis',
    status: 'Draft',
    activityType: 'SPOC Meeting',
    meetingType: 'Telephonic',
    institutionName: 'Grace Clinic Centre',
    location: 'Chicago, IL',
    finalYearStudentsCount: 45,
    headOfInstitution: 'Dr. Gregory House',
    contactNumber: '+1 555-0300',
    spocName: 'James Wilson',
    spocContact: '+1 555-0301',
    spocEmail: 'jwilson@graceclinic.org',
    notes: 'Brief telephone sync on student rotation slots. Draft saved. Plan to finalize physical visit details and numbers tomorrow.',
    dateTime: '2026-05-22T14:00',
    attachments: [],
    history: [
      { id: 'h-31', status: 'Draft', date: '2026-05-21T11:00:00Z', comment: 'Draft saved locally.', user: 'Zandra Kanja' }
    ]
  }
];

const DEFAULT_LOGS: ActivityLog[] = [
  {
    id: 'log-1',
    userId: 'S-201',
    userName: 'Marcus Chen',
    userRole: 'staff',
    action: 'Submitted Report',
    timestamp: '2026-05-18T14:45:00Z',
    details: 'Submitted report REP-2026-001 (Competitor Intelligence) for North America.'
  },
  {
    id: 'log-2',
    userId: 'A-101',
    userName: 'Eleanor Vance',
    userRole: 'admin',
    action: 'Approved Report',
    timestamp: '2026-05-18T17:30:00Z',
    details: 'Approved report REP-2026-001 from Marcus Chen with feedback.'
  }
];

const DEFAULT_NOTIFICATIONS: Notification[] = [
  {
    id: 'nt-1',
    userId: 'S-201',
    title: 'Report Approved',
    message: 'Your report REP-2026-001 has been approved by Admin Eleanor Vance.',
    timestamp: '2026-05-18T17:30:00Z',
    read: false,
    type: 'success',
    reportId: 'REP-2026-001'
  }
];

// Helper to initialize and retrieve local storage keys
const getStorageItem = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setStorageItem = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing key ${key} to localStorage:`, error);
  }
};

const KEYS = {
  USERS: 'rms_db_users',
  REPORTS: 'rms_db_reports',
  LOGS: 'rms_db_logs',
  NOTIFICATIONS: 'rms_db_notifications',
};

// Cached values for live queries (sync context)
let liveReportsCache: MarketReport[] = [];
let liveUsersCache: User[] = [];
let liveLogsCache: ActivityLog[] = [];
let liveNotificationsCache: Notification[] = [];

// ==========================================
// 2. Database Services (Direct API)
// ==========================================

export const dbService = {
  // --- USERS ---
  getUsers: (): User[] => {
    const allowedFilter = (user: User) => ALLOWED_USER_EMAILS.includes(user.email.toLowerCase());

    if (!isFirebaseActive()) {
      const storedUsers = getStorageItem(KEYS.USERS, DEFAULT_USERS);
      const filteredUsers = (storedUsers ?? DEFAULT_USERS).filter(allowedFilter);
      return filteredUsers.length > 0 ? filteredUsers : DEFAULT_USERS;
    }
    // Return local cache when queries are active in context
    const cachedUsers = liveUsersCache.length > 0 ? liveUsersCache : DEFAULT_USERS;
    return cachedUsers.filter(allowedFilter);
  },

  updateUserStatus: (userId: string, status: 'active' | 'suspended', adminName: string): User[] => {
    if (!isFirebaseActive()) {
      const users = dbService.getUsers();
      const index = users.findIndex(u => u.id === userId);
      if (index !== -1) {
        const user = users[index];
        user.status = status;
        users[index] = user;
        setStorageItem(KEYS.USERS, users);

        dbService.addLog({
          userId: 'A-101',
          userName: adminName,
          userRole: 'admin',
          action: status === 'active' ? 'Activated User' : 'Deactivated User',
          details: `${status === 'active' ? 'Activated' : 'Suspended'} staff account of ${user.name}.`
        });

        dbService.addNotification({
          userId: user.id,
          title: status === 'active' ? 'Account Re-activated' : 'Account Suspended',
          message: status === 'active' 
            ? `Your staff account has been re-activated by ${adminName}.`
            : `Your staff account has been suspended by ${adminName}. Please contact support.`,
          type: status === 'active' ? 'success' : 'error'
        });
      }
      return users;
    }

    // LIVE FIRESTORE IMPLEMENTATION
    console.log("[DbService] Updating user access status in live Firestore...");
    const userDocRef = doc(db, 'users', userId);
    updateDoc(userDocRef, { status }).then(() => {
      // Async record activity log and notifications in Firestore
      dbService.addLog({
        userId: 'A-101',
        userName: adminName,
        userRole: 'admin',
        action: status === 'active' ? 'Activated User' : 'Deactivated User',
        details: `${status === 'active' ? 'Activated' : 'Suspended'} account of user UID: ${userId}.`
      });

      dbService.addNotification({
        userId,
        title: status === 'active' ? 'Account Active' : 'Account Suspended',
        message: status === 'active' 
          ? `Your staff profile was re-activated by admin ${adminName}.`
          : `Your staff profile was suspended by admin ${adminName}.`,
        type: status === 'active' ? 'success' : 'error'
      });
    });

    // In live mode, UI sync is driven by the snapshot listeners in Context, return current cache
    return liveUsersCache;
  },

  // --- REPORTS ---
  getReports: (): MarketReport[] => {
    if (!isFirebaseActive()) {
      return getStorageItem(KEYS.REPORTS, DEFAULT_REPORTS);
    }
    return liveReportsCache.length > 0 ? liveReportsCache : DEFAULT_REPORTS;
  },

  addReport: (
    reportData: Omit<MarketReport, 'id' | 'history' | 'feedback'> & { id?: string; status?: 'Pending' | 'Draft' },
    staffName: string
  ): MarketReport => {
    const isEdit = !!reportData.id;
    const finalStatus = reportData.status || 'Pending';

    if (!isFirebaseActive()) {
      const reports = dbService.getReports();
      let finalReport: MarketReport;

      if (isEdit) {
        const index = reports.findIndex(r => r.id === reportData.id);
        if (index !== -1) {
          const oldReport = reports[index];
          finalReport = {
            ...oldReport,
            ...reportData,
            id: reportData.id!,
            status: finalStatus,
            history: [
              ...oldReport.history,
              {
                id: `h-${Date.now()}`,
                status: finalStatus,
                date: new Date().toISOString(),
                comment: finalStatus === 'Draft' 
                  ? 'Draft updated.' 
                  : 'Report compiled and submitted for review.',
                user: staffName
              }
            ]
          } as MarketReport;
          reports[index] = finalReport;
        } else {
          // Fallback if ID is provided but not found
          finalReport = {
            ...reportData,
            id: reportData.id!,
            status: finalStatus,
            history: [
              {
                id: `h-${Date.now()}`,
                status: finalStatus,
                date: new Date().toISOString(),
                comment: finalStatus === 'Draft' 
                  ? 'Draft created.' 
                  : 'Report created and submitted for review.',
                user: staffName
              }
            ]
          } as MarketReport;
          reports.unshift(finalReport);
        }
      } else {
        const newId = `REP-2026-${String(reports.length + 1).padStart(3, '0')}`;
        finalReport = {
          ...reportData,
          id: newId,
          status: finalStatus,
          history: [
            {
              id: `h-${Date.now()}`,
              status: finalStatus,
              date: new Date().toISOString(),
              comment: finalStatus === 'Draft' 
                ? 'Draft saved.' 
                : 'Report created and submitted for review.',
              user: staffName
            }
          ]
        } as MarketReport;
        reports.unshift(finalReport);
      }

      setStorageItem(KEYS.REPORTS, reports);

      dbService.addLog({
        userId: reportData.staffId,
        userName: staffName,
        userRole: 'staff',
        action: finalStatus === 'Draft' ? 'Saved Draft' : 'Submitted Report',
        details: `${finalStatus === 'Draft' ? 'Saved draft' : 'Submitted report'} ${finalReport.id} for ${reportData.institutionName} in ${reportData.location}.`
      });

      if (finalStatus !== 'Draft') {
        const admins = dbService.getUsers().filter(u => u.role === 'admin');
        admins.forEach(admin => {
          dbService.addNotification({
            userId: admin.id,
            title: 'New Report Submitted',
            message: `${staffName} submitted report ${finalReport.id} for ${reportData.institutionName}.`,
            type: 'info',
            reportId: finalReport.id
          });
        });
      }

      return finalReport;
    }

    // LIVE FIRESTORE IMPLEMENTATION
    console.log("[DbService] Upserting report in live Firestore...");
    const reportCollectionRef = collection(db, 'reports');
    const tempId = reportData.id || `REP-${Date.now().toString().slice(-6)}`;

    const firestoreReportDoc = {
      ...reportData,
      status: finalStatus,
      history: [
        {
          id: `h-${Date.now()}`,
          status: finalStatus,
          date: new Date().toISOString(),
          comment: isEdit 
            ? (finalStatus === 'Draft' ? 'Draft report updated in Firestore.' : 'Draft report finalized and submitted to Firestore.')
            : (finalStatus === 'Draft' ? 'Draft report initialized in Firestore.' : 'Report compiled and uploaded directly to Firestore.'),
          user: staffName
        }
      ]
    };

    if (isEdit) {
      const docRef = doc(db, 'reports', reportData.id!);
      updateDoc(docRef, firestoreReportDoc).then(() => {
        dbService.addLog({
          userId: reportData.staffId,
          userName: staffName,
          userRole: 'staff',
          action: finalStatus === 'Draft' ? 'Saved Draft' : 'Submitted Report',
          details: `Updated Firestore report ${reportData.id} (${finalStatus}) for ${reportData.institutionName}.`
        });
      });
    } else {
      addDoc(reportCollectionRef, firestoreReportDoc).then((docRef) => {
        updateDoc(doc(db, 'reports', docRef.id), { id: docRef.id });
        dbService.addLog({
          userId: reportData.staffId,
          userName: staffName,
          userRole: 'staff',
          action: finalStatus === 'Draft' ? 'Saved Draft' : 'Submitted Report',
          details: `Submitted database report ${docRef.id} (${finalStatus}) for ${reportData.institutionName}.`
        });
      });
    }

    return {
      ...reportData,
      id: tempId,
      status: finalStatus,
      history: []
    } as MarketReport;
  },

  updateReportStatus: (
    reportId: string, 
    status: 'Approved' | 'Rejected', 
    feedback: string, 
    adminId: string, 
    adminName: string
  ): MarketReport | undefined => {
    if (!isFirebaseActive()) {
      const reports = dbService.getReports();
      const index = reports.findIndex(r => r.id === reportId);
      if (index === -1) return undefined;

      const report = reports[index];
      report.status = status;
      report.feedback = feedback;
      
      report.history.push({
        id: `h-${Date.now()}`,
        status,
        date: new Date().toISOString(),
        comment: feedback || `${status} by administration.`,
        user: adminName
      });

      reports[index] = report;
      setStorageItem(KEYS.REPORTS, reports);

      dbService.addLog({
        userId: adminId,
        userName: adminName,
        userRole: 'admin',
        action: status === 'Approved' ? 'Approved Report' : 'Rejected Report',
        details: `${status === 'Approved' ? 'Approved' : 'Rejected'} report ${reportId} from ${report.staffName}.`
      });

      dbService.addNotification({
        userId: report.staffId,
        title: `Report ${status}`,
        message: `Your report ${reportId} was ${status.toLowerCase()} by ${adminName}.`,
        type: status === 'Approved' ? 'success' : 'error',
        reportId
      });

      return report;
    }

    // LIVE FIRESTORE IMPLEMENTATION
    console.log("[DbService] Committing report decision in live Firestore...");
    const reportRef = doc(db, 'reports', reportId);
    
    getDoc(reportRef).then((reportSnap) => {
      if (!reportSnap.exists()) return;
      const report = reportSnap.data() as MarketReport;
      
      const newHistory = [...(report.history || [])];
      newHistory.push({
        id: `h-${Date.now()}`,
        status,
        date: new Date().toISOString(),
        comment: feedback || `${status} review completed.`,
        user: adminName
      });

      updateDoc(reportRef, {
        status,
        feedback,
        history: newHistory
      }).then(() => {
        dbService.addLog({
          userId: adminId,
          userName: adminName,
          userRole: 'admin',
          action: status === 'Approved' ? 'Approved Report' : 'Rejected Report',
          details: `Audited and ${status} report document ID ${reportId}.`
        });

        dbService.addNotification({
          userId: report.staffId,
          title: `Report ${status}`,
          message: `Your report document ${reportId} review status: ${status}. Feedback: "${feedback}"`,
          type: status === 'Approved' ? 'success' : 'error',
          reportId
        });
      });
    });

    return undefined;
  },

  // --- LOGS ---
  getLogs: (): ActivityLog[] => {
    if (!isFirebaseActive()) {
      return getStorageItem(KEYS.LOGS, DEFAULT_LOGS);
    }
    return liveLogsCache.length > 0 ? liveLogsCache : DEFAULT_LOGS;
  },

  addLog: async (logData: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<ActivityLog> => {
    if (!isFirebaseActive()) {
      const logs = dbService.getLogs();
      const newLog: ActivityLog = {
        ...logData,
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString()
      };
      logs.unshift(newLog);
      setStorageItem(KEYS.LOGS, logs);
      return newLog;
    }

    // WRITE LOG TO FIRESTORE
    try {
      const logsCollectionRef = collection(db, 'activity_logs');
      const newLogDoc = {
        ...logData,
        timestamp: new Date().toISOString()
      };
      const docRef = await addDoc(logsCollectionRef, newLogDoc);
      await updateDoc(doc(db, 'activity_logs', docRef.id), { id: docRef.id });
      
      return {
        ...newLogDoc,
        id: docRef.id
      };
    } catch (e) {
      console.warn("Firestore logging failed", e);
      return {
        ...logData,
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString()
      };
    }
  },

  // --- NOTIFICATIONS ---
  getNotifications: (userId?: string): Notification[] => {
    if (!isFirebaseActive()) {
      const notifs = getStorageItem(KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS);
      if (userId) {
        return notifs.filter(n => n.userId === userId);
      }
      return notifs;
    }

    if (userId) {
      return liveNotificationsCache.filter(n => n.userId === userId);
    }
    return liveNotificationsCache;
  },

  addNotification: async (notifData: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<Notification> => {
    if (!isFirebaseActive()) {
      const notifs = getStorageItem(KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS);
      const newNotif: Notification = {
        ...notifData,
        id: `nt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        read: false
      };
      notifs.unshift(newNotif);
      setStorageItem(KEYS.NOTIFICATIONS, notifs);
      return newNotif;
    }

    // WRITE NOTIFICATION TO FIRESTORE
    try {
      const notifCollectionRef = collection(db, 'notifications');
      const newNotifDoc = {
        ...notifData,
        timestamp: new Date().toISOString(),
        read: false
      };
      const docRef = await addDoc(notifCollectionRef, newNotifDoc);
      await updateDoc(doc(db, 'notifications', docRef.id), { id: docRef.id });
      return {
        ...newNotifDoc,
        id: docRef.id
      };
    } catch (e) {
      console.warn("Firestore notifications push failed", e);
      return {
        ...notifData,
        id: `nt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        read: false
      };
    }
  },

  markNotificationAsRead: (notificationId: string): void => {
    if (!isFirebaseActive()) {
      const notifs = getStorageItem(KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS);
      const index = notifs.findIndex(n => n.id === notificationId);
      if (index !== -1) {
        notifs[index].read = true;
        setStorageItem(KEYS.NOTIFICATIONS, notifs);
      }
      return;
    }

    // LIVE UPDATE FIRESTORE
    updateDoc(doc(db, 'notifications', notificationId), { read: true });
  },

  markAllNotificationsAsRead: (userId: string): void => {
    if (!isFirebaseActive()) {
      const notifs = getStorageItem(KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS);
      const updated = notifs.map(n => n.userId === userId ? { ...n, read: true } : n);
      setStorageItem(KEYS.NOTIFICATIONS, updated);
      return;
    }

    // Query unread items for user and commit updates
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', userId), 
      where('read', '==', false)
    );
    
    getDocs(q).then((snap) => {
      snap.forEach((dDoc) => {
        updateDoc(doc(db, 'notifications', dDoc.id), { read: true });
      });
    });
  },

  // --- STATS ---
  getDashboardStats: (): DashboardStats => {
    const reportsList = dbService.getReports();
    const usersList = dbService.getUsers();
    
    const activeStaff = usersList.filter(u => u.role === 'staff' && u.status === 'active').length;
    const total = reportsList.length;
    const pending = reportsList.filter(r => r.status === 'Pending').length;
    const approved = reportsList.filter(r => r.status === 'Approved').length;
    const rejected = reportsList.filter(r => r.status === 'Rejected').length;
    
    const satisfiedReports = reportsList.filter(r => r.metrics?.customerSatisfaction);
    const avgSatisfaction = satisfiedReports.length > 0
      ? satisfiedReports.reduce((acc, curr) => acc + (curr.metrics?.customerSatisfaction || 0), 0) / satisfiedReports.length
      : 4.2;

    return {
      totalReports: total,
      pendingReports: pending,
      approvedReports: approved,
      rejectedReports: rejected,
      activeStaffCount: activeStaff,
      monthlyGrowthRate: 14.5,
      averageSatisfaction: Math.round(avgSatisfaction * 10) / 10
    };
  },

  // --- LIVE SNAPSHOT INJECTORS (Call from Providers for Real-time listeners) ---
  syncLiveCollections: (
    onReportsChange: (reps: MarketReport[]) => void,
    onUsersChange: (usrs: User[]) => void,
    onLogsChange: (logs: ActivityLog[]) => void,
    onNotificationsChange: (notifs: Notification[]) => void
  ): () => void => {
    if (!isFirebaseActive()) {
      return () => {}; // No-op in mock
    }

    console.log("[DbService] Registering real-time listeners on live Firestore collections...");
    
    // In actual production, developers instantiate Firestore onSnapshot listeners here:
    // 
    // const unsubReports = onSnapshot(query(collection(db, 'reports'), orderBy('date', 'desc')), (snap) => {
    //   const reps: MarketReport[] = [];
    //   snap.forEach(d => reps.push(d.data() as MarketReport));
    //   liveReportsCache = reps;
    //   onReportsChange(reps);
    // });
    //
    // Repeat for users, logs, notifications, and return a merged unsub function.

    // Standard fallback listeners to fetch initial items in live mode
    getDocs(collection(db, 'reports')).then((snap) => {
      const items: MarketReport[] = [];
      snap.forEach(d => items.push(d.data() as MarketReport));
      liveReportsCache = items;
      onReportsChange(items);
    });

    getDocs(collection(db, 'users')).then((snap) => {
      const items: User[] = [];
      snap.forEach(d => items.push(d.data() as User));
      liveUsersCache = items;
      onUsersChange(items);
    });

    getDocs(collection(db, 'activity_logs')).then((snap) => {
      const items: ActivityLog[] = [];
      snap.forEach(d => items.push(d.data() as ActivityLog));
      liveLogsCache = items;
      onLogsChange(items);
    });

    getDocs(collection(db, 'notifications')).then((snap) => {
      const items: Notification[] = [];
      snap.forEach(d => items.push(d.data() as Notification));
      liveNotificationsCache = items;
      onNotificationsChange(items);
    });

    return () => {
      console.log("[DbService] Unsubscribed real-time queries.");
    };
  }
};
