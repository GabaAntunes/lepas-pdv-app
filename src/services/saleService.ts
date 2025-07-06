
import { db, isFirebaseConfigured } from '@/lib/firebase';
import type { ActiveSession, Payment } from '@/types';
import { collection, doc, Timestamp, increment, writeBatch, getDoc } from 'firebase/firestore';

export const finalizeSale = async (
  session: ActiveSession,
  paymentDetails: {
    paymentMethods: Payment[],
    totalAmount: number,
    timeCost: number,
    consumptionCost: number,
    durationInMinutes: number,
    changeGiven: number,
    couponCode?: string,
    couponId?: string,
    discountApplied?: number
  },
  closeSession: boolean
) => {
  if (!isFirebaseConfigured || !db) {
    throw new Error("Firebase não está configurado.");
  }

  const batch = writeBatch(db);

  try {
    // 1. Create Sale Record in 'vendas' collection
    if (paymentDetails.totalAmount > 0 || !closeSession) {
      const saleRecordRef = doc(collection(db, 'vendas'));
      const saleRecord = {
        finalizedAt: Timestamp.now(),
        responsible: session.responsible,
        responsibleCpf: session.responsibleCpf,
        children: session.children,
        durationInMinutes: Math.round(paymentDetails.durationInMinutes),
        timeCost: paymentDetails.timeCost,
        consumption: session.consumption,
        consumptionCost: paymentDetails.consumptionCost,
        couponCode: paymentDetails.couponCode || null,
        couponId: paymentDetails.couponId || null,
        discountApplied: paymentDetails.discountApplied || 0,
        totalAmount: paymentDetails.totalAmount,
        paymentMethods: paymentDetails.paymentMethods,
        changeGiven: paymentDetails.changeGiven,
      };
      batch.set(saleRecordRef, saleRecord);
    }

    // NOTE: Product stock is now updated in real-time via the ConsumptionModal.
    // The stock update logic has been removed from this function to avoid double-counting.
    
    // 2. Increment coupon usage count if a coupon was applied for the first time
    if (paymentDetails.couponId && !session.isCouponUsageCounted) {
        const couponRef = doc(db, 'coupons', paymentDetails.couponId);
        batch.update(couponRef, { uses: increment(1) });
    }

    // 3. Either delete the active session or update it for continuation
    const activeSessionRef = doc(db, 'atendimentos_ativos', session.id);
    if (closeSession) {
      batch.delete(activeSessionRef);
    } else {
      // Settle the bill but keep the session active.
      const updateData: any = {
        consumption: [], // Clear consumption as it's been paid
        maxTime: Math.max(session.maxTime, Math.round(paymentDetails.durationInMinutes)),
        isInitialPaymentMade: true, // Mark the account as settled for now
        totalPaidSoFar: increment(paymentDetails.totalAmount),
      };

      if (paymentDetails.couponId && !session.isCouponUsageCounted) {
        updateData.isCouponUsageCounted = true;
      }

      batch.update(activeSessionRef, updateData);
    }

    await batch.commit();

  } catch (e: any) {
    console.error("Batch write failed: ", e);
    throw new Error(e.message || "A transação falhou. Verifique os dados e tente novamente.");
  }
};
