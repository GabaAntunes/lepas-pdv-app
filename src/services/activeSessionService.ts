
import { db, isFirebaseConfigured } from '@/lib/firebase';
import type { ActiveSession, ConsumptionItem } from '@/types';
import { collection, onSnapshot, updateDoc, doc, Unsubscribe, query, orderBy, Timestamp, addDoc, getDoc, deleteDoc, writeBatch, increment } from 'firebase/firestore';

const docToActiveSession = (doc: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): ActiveSession => {
    const data = doc.data();
    if (!data) throw new Error("Document data is undefined for docToActiveSession.");

    const startTimeMillis = data.startTime instanceof Timestamp ? data.startTime.toMillis() : data.startTime;

    return {
        id: doc.id,
        responsible: data.responsible || 'N/A',
        responsibleCpf: data.responsibleCpf || '',
        responsiblePhone: data.responsiblePhone || '',
        children: data.children || [],
        startTime: startTimeMillis,
        maxTime: data.maxTime || 60,
        isFullAfternoon: data.isFullAfternoon ?? false,
        consumption: data.consumption || [],
        couponCode: data.couponCode,
        couponId: data.couponId,
        discountApplied: data.discountApplied,
        isInitialPaymentMade: data.isInitialPaymentMade ?? false,
        totalPaidSoFar: data.totalPaidSoFar || 0,
        isCouponUsageCounted: data.isCouponUsageCounted ?? false,
    } as ActiveSession;
};


export const listenToActiveSessions = (
  callback: (sessions: ActiveSession[]) => void,
  onError: (error: Error) => void
): Unsubscribe => {
    if (!isFirebaseConfigured || !db) {
        const error = new Error("Firebase is not configured.");
        onError(error);
        return () => {};
    }
    
    const sessionsCollectionRef = collection(db, 'atendimentos_ativos');
    const q = query(sessionsCollectionRef, orderBy("startTime", "asc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const sessions = snapshot.docs.map(docToActiveSession);
        callback(sessions);
    }, (error) => {
        console.error("Error listening to active sessions:", error);
        onError(error);
    });

    return unsubscribe;
};

export const addActiveSession = async (sessionData: {
    responsible: string;
    responsibleCpf: string;
    responsiblePhone?: string;
    children: string[];
    maxTime: number;
    isFullAfternoon?: boolean;
    couponCode?: string;
    discountApplied?: number;
    couponId?: string;
}) => {
    if (!isFirebaseConfigured || !db) {
        throw new Error("Firebase is not configured.");
    }
    const sessionsCollectionRef = collection(db, 'atendimentos_ativos');
    const dataToAdd: any = {
      ...sessionData,
      startTime: Timestamp.now(),
      consumption: [],
      isInitialPaymentMade: false,
      totalPaidSoFar: 0,
      isCouponUsageCounted: false,
      isFullAfternoon: sessionData.isFullAfternoon ?? false,
    }

    if(sessionData.couponCode) dataToAdd.couponCode = sessionData.couponCode;
    if(sessionData.couponId) dataToAdd.couponId = sessionData.couponId;
    if(sessionData.discountApplied) dataToAdd.discountApplied = sessionData.discountApplied;
    if(sessionData.responsiblePhone) dataToAdd.responsiblePhone = sessionData.responsiblePhone;

    await addDoc(sessionsCollectionRef, dataToAdd);
};

export const updateSessionConsumption = async (sessionId: string, consumption: ConsumptionItem[]) => {
    if (!isFirebaseConfigured || !db) {
        throw new Error("Firebase is not configured.");
    }
    const sessionDocRef = doc(db, 'atendimentos_ativos', sessionId);
    const consumptionData = consumption.map(item => ({ ...item }));
    await updateDoc(sessionDocRef, { consumption: consumptionData });
}

export const addTimeToSession = async (sessionId:string, newMaxTime: number) => {
    if (!isFirebaseConfigured || !db) {
        throw new Error("Firebase is not configured.");
    }
    const sessionDocRef = doc(db, 'atendimentos_ativos', sessionId);
    // When time is added, it creates a new balance to be paid.
    // Re-using isInitialPaymentMade as a flag for "is account settled?".
    // Setting it to false re-enables the payment button.
    await updateDoc(sessionDocRef, { 
        maxTime: newMaxTime,
        isInitialPaymentMade: false,
    });
}

export const getActiveSessionById = async (sessionId: string): Promise<ActiveSession | null> => {
    if (!isFirebaseConfigured || !db) {
        throw new Error("Firebase is not configured.");
    }
    const sessionDocRef = doc(db, 'atendimentos_ativos', sessionId);
    const docSnap = await getDoc(sessionDocRef);

    if (!docSnap.exists()) {
        console.error(`No active session found with ID: ${sessionId}`);
        return null;
    }
    
    return docToActiveSession(docSnap);
};

export const deleteActiveSession = async (sessionId: string, isCancellation: boolean = false) => {
    if (!isFirebaseConfigured || !db) {
        throw new Error("Firebase is not configured.");
    }
    
    const sessionDocRef = doc(db, 'atendimentos_ativos', sessionId);

    if (isCancellation) {
        // If it's a cancellation (error), return consumed items to stock
        const batch = writeBatch(db);
        const sessionSnap = await getDoc(sessionDocRef);

        if (sessionSnap.exists()) {
            const consumption = sessionSnap.data().consumption as ConsumptionItem[];
            if (consumption && consumption.length > 0) {
                for (const item of consumption) {
                    const productRef = doc(db, 'products', item.productId);
                    // Return items to stock by incrementing the quantity
                    batch.update(productRef, { stock: increment(item.quantity) });
                }
            }
        }
        
        // Delete the session document as part of the same batch
        batch.delete(sessionDocRef);
        await batch.commit();

    } else {
        // Normal deletion without stock return (e.g., child left normally but without payment)
        await deleteDoc(sessionDocRef);
    }
};
