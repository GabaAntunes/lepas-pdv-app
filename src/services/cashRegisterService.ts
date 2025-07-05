import { db, isFirebaseConfigured } from '@/lib/firebase';
import type { CashSession, SaleRecord, Withdrawal } from '@/types';
import { User } from 'firebase/auth';
import { collection, getDocs, addDoc, updateDoc, doc, DocumentData, QueryDocumentSnapshot, query, where, limit, DocumentSnapshot, orderBy, Timestamp, runTransaction } from 'firebase/firestore';

const docToCashSession = (doc: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): CashSession => {
    const data = doc.data();
    if (!data) throw new Error("Document data is undefined.");

    const withdrawals = (data.withdrawals || []).map((w: any) => ({
        ...w,
        timestamp: w.timestamp instanceof Timestamp ? w.timestamp.toMillis() : w.timestamp,
    }));

    const openedAt = data.openedAt instanceof Timestamp ? data.openedAt.toMillis() : data.openedAt;
    const closedAt = data.closedAt instanceof Timestamp ? data.closedAt.toMillis() : (data.closedAt || undefined);

    return {
        id: doc.id,
        status: data.status,
        openedAt: openedAt,
        openingBalance: data.openingBalance,
        openedBy: data.openedBy,
        withdrawals: withdrawals,
        closedAt: closedAt,
        closedBy: data.closedBy,
        countedBalance: data.countedBalance,
        expectedCashAmount: data.expectedCashAmount,
        difference: data.difference,
        finalCashSales: data.finalCashSales,
    } as CashSession;
};

export const getOpenCashSession = async (): Promise<CashSession | null> => {
    if (!isFirebaseConfigured || !db) return null;
    const collectionRef = collection(db, 'caixa_sessoes');
    const q = query(collectionRef, where("status", "==", "open"), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        return null;
    }
    return docToCashSession(snapshot.docs[0]);
};

export const getSalesForSession = async (openedAt: number): Promise<SaleRecord[]> => {
    if (!isFirebaseConfigured || !db) return [];
    
    const salesCollection = collection(db, 'vendas');
    const q = query(salesCollection, where("finalizedAt", ">=", Timestamp.fromMillis(openedAt)), orderBy("finalizedAt", "desc"));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            finalizedAt: (data.finalizedAt as Timestamp).toMillis(),
        } as SaleRecord
    });
}

export const openCashRegister = async (openingBalance: number, user: User) => {
    if (!isFirebaseConfigured || !db) throw new Error("Firebase não está configurado.");
    
    const existingSession = await getOpenCashSession();
    if (existingSession) throw new Error("Já existe um caixa aberto.");

    const collectionRef = collection(db, 'caixa_sessoes');
    const newSessionData = {
        status: 'open',
        openedAt: Timestamp.now(),
        openedBy: { uid: user.uid, email: user.email || '' },
        openingBalance,
        withdrawals: [],
    };
    await addDoc(collectionRef, newSessionData);
}

export const registerWithdrawal = async (sessionId: string, amount: number, reason: string, user: User) => {
    if (!isFirebaseConfigured || !db) throw new Error("Firebase não está configurado.");
    const docRef = doc(db, 'caixa_sessoes', sessionId);
    
    const withdrawal = {
        amount,
        reason,
        timestamp: Timestamp.now(),
        userName: user.email || 'N/A'
    };

    await runTransaction(db, async (transaction) => {
        const sessionDoc = await transaction.get(docRef);
        if (!sessionDoc.exists()) throw new Error("Sessão do caixa não encontrada.");

        const data = sessionDoc.data();
        const existingWithdrawals = data.withdrawals || [];
        const updatedWithdrawals = [...existingWithdrawals, withdrawal];
        
        transaction.update(docRef, { withdrawals: updatedWithdrawals });
    });
};

export const closeCashRegister = async (sessionId: string, countedBalance: number, cashSalesTotal: number, user: User) => {
    if (!isFirebaseConfigured || !db) throw new Error("Firebase não está configurado.");
    const docRef = doc(db, 'caixa_sessoes', sessionId);

    await runTransaction(db, async (transaction) => {
        const sessionDoc = await transaction.get(docRef);
        if (!sessionDoc.exists()) throw new Error("Sessão do caixa não encontrada.");

        const data = sessionDoc.data();
        if (data.status === 'closed') throw new Error("Este caixa já foi fechado.");

        const withdrawalsTotal = data.withdrawals?.reduce((sum: number, w: Withdrawal) => sum + w.amount, 0) || 0;
        const expectedCashAmount = data.openingBalance + cashSalesTotal - withdrawalsTotal;
        const difference = countedBalance - expectedCashAmount;

        transaction.update(docRef, {
            status: 'closed',
            closedAt: Timestamp.now(),
            closedBy: { uid: user.uid, email: user.email || '' },
            countedBalance,
            expectedCashAmount,
            difference,
            finalCashSales: cashSalesTotal,
        });
    });
};
