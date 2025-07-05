
import { db, isFirebaseConfigured } from '@/lib/firebase';
import type { SaleRecord } from '@/types';
import { collection, getDocs, query, where, DocumentData, QueryDocumentSnapshot, Timestamp, orderBy } from 'firebase/firestore';

const docToSaleRecord = (doc: QueryDocumentSnapshot<DocumentData>): SaleRecord => {
    const data = doc.data();
    const finalizedAtMillis = data.finalizedAt instanceof Timestamp ? data.finalizedAt.toMillis() : data.finalizedAt;

    return {
        id: doc.id,
        finalizedAt: finalizedAtMillis,
        responsible: data.responsible,
        responsibleCpf: data.responsibleCpf,
        children: data.children || [],
        durationInMinutes: data.durationInMinutes,
        timeCost: data.timeCost,
        consumption: data.consumption || [],
        consumptionCost: data.consumptionCost,
        couponCode: data.couponCode,
        couponId: data.couponId,
        discountApplied: data.discountApplied,
        totalAmount: data.totalAmount,
        paymentMethods: data.paymentMethods || [{ method: data.paymentMethod, amount: data.totalAmount }],
        changeGiven: data.changeGiven || 0,
    } as SaleRecord;
};

export const getHistoryByCpf = async (cpf: string): Promise<SaleRecord[]> => {
    if (!isFirebaseConfigured || !db) return [];
    
    const historyCollectionRef = collection(db, 'vendas');
    // Query only by CPF to avoid needing a composite index. Sorting is handled on the client.
    const q = query(historyCollectionRef, where("responsibleCpf", "==", cpf));
    const data = await getDocs(q);
    
    const sales = data.docs.map(docToSaleRecord);

    // Sort records by finalization date, newest first.
    sales.sort((a, b) => b.finalizedAt - a.finalizedAt);
    
    return sales;
};

export const getAllSales = async (): Promise<SaleRecord[]> => {
    if (!isFirebaseConfigured || !db) return [];
    
    const historyCollectionRef = collection(db, 'vendas');
    const q = query(historyCollectionRef, orderBy("finalizedAt", "desc"));
    const data = await getDocs(q);
    
    const sales = data.docs.map(docToSaleRecord);
    
    return sales;
};
