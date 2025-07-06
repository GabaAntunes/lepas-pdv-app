
import { db, isFirebaseConfigured } from '@/lib/firebase';
import type { Product } from '@/types';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentData, QueryDocumentSnapshot, query, orderBy, increment, runTransaction, getDoc, DocumentSnapshot } from 'firebase/firestore';
import { addStockNotification } from './notificationService';

const docToProduct = (doc: DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>): Product => {
    const data = doc.data();
    if (!data) throw new Error("Document data is undefined for docToProduct.");
    return {
        id: doc.id,
        name: data.name,
        price: data.price,
        stock: data.stock,
        minStock: data.minStock || 0,
    };
};

export const getProducts = async (): Promise<Product[]> => {
    if (!isFirebaseConfigured || !db) return [];
    
    const productsCollectionRef = collection(db, 'products');
    const q = query(productsCollectionRef, orderBy("name"));
    const data = await getDocs(q);
    return data.docs.map(docToProduct);
};

export const addProduct = async (product: Omit<Product, 'id'>) => {
    if (!isFirebaseConfigured || !db) return;
    const productsCollectionRef = collection(db, 'products');
    await addDoc(productsCollectionRef, { ...product, minStock: product.minStock || 0 });
};

export const updateProduct = async (id: string, updates: Partial<Omit<Product, 'id'>>) => {
    if (!isFirebaseConfigured || !db) return;
    const productDoc = doc(db, 'products', id);
    await updateDoc(productDoc, { ...updates, minStock: updates.minStock || 0 });
};

export const deleteProduct = async (id: string) => {
    if (!isFirebaseConfigured || !db) return;
    const productDoc = doc(db, 'products', id);
    await deleteDoc(productDoc);
};

export const updateProductStock = async (productId: string, quantityChange: number) => {
    if (!isFirebaseConfigured || !db) {
        throw new Error("Firebase is not configured.");
    }
    const productRef = doc(db, 'products', productId);

    try {
        await runTransaction(db, async (transaction) => {
            const productDoc = await transaction.get(productRef);
            if (!productDoc.exists()) {
                throw new Error("Produto não encontrado.");
            }

            const currentStock = productDoc.data().stock || 0;
            const newStock = currentStock + quantityChange;

            if (newStock < 0) {
                throw new Error("Estoque insuficiente para completar a operação.");
            }
            transaction.update(productRef, { stock: newStock });
        });

        // Post-transaction check for notification
        const updatedProductSnap = await getDoc(productRef);
        if (updatedProductSnap.exists()) {
            const updatedProduct = docToProduct(updatedProductSnap);
            if (updatedProduct.minStock && updatedProduct.stock <= updatedProduct.minStock) {
                await addStockNotification(updatedProduct);
            }
        }
    } catch (e: any) {
        console.error("Stock update transaction failed: ", e);
        throw e;
    }
};
