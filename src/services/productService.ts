
import { db, isFirebaseConfigured } from '@/lib/firebase';
import type { Product } from '@/types';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentData, QueryDocumentSnapshot, query, orderBy, increment } from 'firebase/firestore';

const docToProduct = (doc: QueryDocumentSnapshot<DocumentData>): Product => {
    const data = doc.data();
    return {
        id: doc.id,
        name: data.name,
        price: data.price,
        stock: data.stock,
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
    await addDoc(productsCollectionRef, product);
};

export const updateProduct = async (id: string, updates: Partial<Omit<Product, 'id'>>) => {
    if (!isFirebaseConfigured || !db) return;
    const productDoc = doc(db, 'products', id);
    await updateDoc(productDoc, updates);
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
    const productDoc = doc(db, 'products', productId);
    await updateDoc(productDoc, { stock: increment(quantityChange) });
};
