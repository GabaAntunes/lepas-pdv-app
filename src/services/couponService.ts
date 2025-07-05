import { db, isFirebaseConfigured } from '@/lib/firebase';
import type { Coupon } from '@/types';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentData, QueryDocumentSnapshot, query, where, limit, DocumentSnapshot, orderBy, Timestamp } from 'firebase/firestore';

const docToCoupon = (doc: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): Coupon => {
    const data = doc.data();
    if (!data) throw new Error("Document data is undefined.");
    return {
        id: doc.id,
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        status: data.status,
        uses: data.uses || 0,
        usageLimit: data.usageLimit,
        validUntil: data.validUntil ? (data.validUntil as Timestamp).toMillis() : undefined,
    } as Coupon;
};

export const getCoupons = async (): Promise<Coupon[]> => {
    if (!isFirebaseConfigured || !db) return [];
    
    const couponsCollectionRef = collection(db, 'coupons');
    const q = query(couponsCollectionRef, orderBy("code"));
    const data = await getDocs(q);
    
    return data.docs.map(docToCoupon);
};

export const getCouponByCode = async (code: string): Promise<Coupon | null> => {
    if (!isFirebaseConfigured || !db) return null;
    const couponsCollectionRef = collection(db, 'coupons');
    const q = query(couponsCollectionRef, where("code", "==", code.toUpperCase()), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        return null;
    }
    const coupon = docToCoupon(snapshot.docs[0]);

    // Perform validations
    if (coupon.status !== 'active') return null;
    if (coupon.validUntil && coupon.validUntil < Date.now()) return null;
    if (coupon.usageLimit && coupon.usageLimit > 0 && coupon.uses >= coupon.usageLimit) return null;

    return coupon;
}

export const addCoupon = async (coupon: Omit<Coupon, 'id' | 'uses'> & { validUntil?: Date }) => {
    if (!isFirebaseConfigured || !db) throw new Error("Firebase is not configured.");
    
    const couponsCollectionRef = collection(db, 'coupons');
    
    const dataToAdd: any = {
      ...coupon,
      code: coupon.code.toUpperCase(),
      uses: 0,
      usageLimit: coupon.usageLimit || 0
    };

    if (coupon.validUntil) {
        dataToAdd.validUntil = Timestamp.fromDate(coupon.validUntil);
    } else {
        delete dataToAdd.validUntil;
    }

    await addDoc(couponsCollectionRef, dataToAdd);
};

export const updateCoupon = async (id: string, updates: Partial<Omit<Coupon, 'id' | 'uses'> & { validUntil?: Date }>) => {
    if (!isFirebaseConfigured || !db) throw new Error("Firebase is not configured.");
    
    const couponDoc = doc(db, 'coupons', id);
    const updateData: { [key: string]: any } = { ...updates };

    if (updates.code) {
        updateData.code = updates.code.toUpperCase();
    }
    if (updates.validUntil) {
        updateData.validUntil = Timestamp.fromDate(updates.validUntil);
    } else if (updates.hasOwnProperty('validUntil') && !updates.validUntil) {
        // Handle case where date is cleared
        updateData.validUntil = null;
    }


    await updateDoc(couponDoc, updateData);
};

export const deleteCoupon = async (id: string) => {
    if (!isFirebaseConfigured || !db) throw new Error("Firebase is not configured.");
    const couponDoc = doc(db, 'coupons', id);
    await deleteDoc(couponDoc);
};
