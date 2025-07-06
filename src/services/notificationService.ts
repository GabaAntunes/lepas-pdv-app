
import { db, isFirebaseConfigured } from '@/lib/firebase';
import type { AppNotification, Product } from '@/types';
import { collection, onSnapshot, query, orderBy, Timestamp, addDoc, getDocs, where, Unsubscribe, deleteDoc, doc, writeBatch } from 'firebase/firestore';

const notificationsCollectionRef = collection(db, 'notifications');

export const listenToNotifications = (
  callback: (notifications: AppNotification[]) => void,
  onError: (error: Error) => void
): Unsubscribe => {
    if (!isFirebaseConfigured || !db) {
        const error = new Error("Firebase is not configured.");
        onError(error);
        return () => {};
    }
    
    const q = query(notificationsCollectionRef, orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => {
            const data = doc.data();
            const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt;

            return {
                id: doc.id,
                ...data,
                createdAt: createdAt,
            } as AppNotification;
        });
        callback(notifications);
    }, (error) => {
        console.error("Error listening to notifications:", error);
        onError(error);
    });

    return unsubscribe;
};

export const addStockNotification = async (product: Product) => {
    if (!isFirebaseConfigured || !db) throw new Error("Firebase is not configured.");

    const q = query(notificationsCollectionRef, where("entityId", "==", product.id), where("type", "==", "stock"));
    const existing = await getDocs(q);
    if (!existing.empty) {
        return; 
    }

    const newNotification = {
        type: 'stock',
        message: `O estoque de "${product.name}" está baixo (${product.stock} restantes).`,
        entityId: product.id,
        createdAt: Timestamp.now(),
        link: `/settings/products?highlight=${product.id}`
    };
    await addDoc(notificationsCollectionRef, newNotification);
};


export const deleteNotification = async (id: string) => {
    if (!isFirebaseConfigured || !db) throw new Error("Firebase is not configured.");
    const notificationDoc = doc(db, 'notifications', id);
    await deleteDoc(notificationDoc);
};

export const deleteAllNotifications = async () => {
    if (!isFirebaseConfigured || !db) throw new Error("Firebase is not configured.");
    const snapshot = await getDocs(notificationsCollectionRef);
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
};
