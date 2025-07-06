
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Separator } from "../ui/separator";
import { ScrollArea } from "../ui/scroll-area";
import { Product, ConsumptionItem, ActiveSession } from "@/types";
import { getProducts, updateProductStock } from "@/services/productService";
import { updateSessionConsumption } from "@/services/activeSessionService";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Minus, Plus, Search, ShoppingBag, Trash2 } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { cn } from "@/lib/utils";

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

interface ConsumptionModalProps {
    session: ActiveSession | null;
    isOpen: boolean;
    onClose: () => void;
}

export function ConsumptionModal({ session, isOpen, onClose }: ConsumptionModalProps) {
    const { toast } = useToast();
    const [masterProducts, setMasterProducts] = useState<Product[]>([]);
    const [comanda, setComanda] = useState<ConsumptionItem[]>([]);
    const [filter, setFilter] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [isUpdatingItem, setIsUpdatingItem] = useState<string | null>(null);

    useEffect(() => {
        async function fetchProducts() {
            if (!isOpen) return;
            setIsLoadingProducts(true);
            try {
                const productsData = await getProducts();
                setMasterProducts(productsData);
            } catch (error) {
                toast({ variant: "destructive", title: "Erro ao carregar produtos" });
            } finally {
                setIsLoadingProducts(false);
            }
        }
        fetchProducts();
    }, [isOpen, toast]);
    
    useEffect(() => {
        if (session) {
            setComanda(session.consumption ? JSON.parse(JSON.stringify(session.consumption)) : []);
        }
    }, [session]);
    
    const availableProducts = useMemo(() => {
        if (!masterProducts.length) return [];
        return masterProducts.filter(p => 
            p.name.toLowerCase().includes(filter.toLowerCase())
        );
    }, [masterProducts, filter]);

    const subtotal = useMemo(() => {
        return comanda.reduce((acc, item) => acc + item.price * item.quantity, 0);
    }, [comanda]);

    const handleUpdateQuantity = async (productId: string, change: 1 | -1) => {
        if (isUpdatingItem) return;
        setIsUpdatingItem(productId);

        try {
            const masterProduct = masterProducts.find(p => p.id === productId);
            if (!masterProduct) throw new Error("Produto não encontrado.");

            if (change === 1 && masterProduct.stock <= 0) {
                toast({ variant: "destructive", title: "Estoque esgotado", description: `Não há mais "${masterProduct.name}" em estoque.` });
                return;
            }

            await updateProductStock(productId, -change);

            setMasterProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: p.stock - change } : p));
            
            const itemInComanda = comanda.find(item => item.productId === productId);
            const newQuantity = (itemInComanda?.quantity || 0) + change;

            if (newQuantity <= 0) {
                setComanda(prev => prev.filter(item => item.productId !== productId));
            } else {
                if (itemInComanda) {
                    setComanda(prev => prev.map(item =>
                        item.productId === productId ? { ...item, quantity: newQuantity } : item
                    ));
                } else {
                    setComanda(prev => [...prev, {
                        productId: masterProduct.id,
                        name: masterProduct.name,
                        price: masterProduct.price,
                        quantity: 1,
                    }]);
                }
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro ao atualizar o estoque do produto." });
        } finally {
            setIsUpdatingItem(null);
        }
    };

    const handleRemoveItem = async (productId: string) => {
        if (isUpdatingItem) return;
        setIsUpdatingItem(productId);

        try {
            const itemInComanda = comanda.find(item => item.productId === productId);
            if (!itemInComanda) return;

            await updateProductStock(productId, itemInComanda.quantity);

            setMasterProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: p.stock + itemInComanda.quantity } : p));
            setComanda(prev => prev.filter(item => item.productId !== productId));
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro ao devolver produto ao estoque." });
        } finally {
            setIsUpdatingItem(null);
        }
    };

    const handleConfirm = async () => {
        if (!session) return;
        setIsSaving(true);
        try {
            await updateSessionConsumption(session.id, comanda);
            toast({ title: "Consumo atualizado com sucesso!" });
            onClose();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro ao salvar consumo" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        if(isSaving || isUpdatingItem) return;
        onClose();
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0" onPointerDownOutside={(e) => (isSaving || !!isUpdatingItem) && e.preventDefault()}>
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="font-headline text-2xl">Gerenciar Consumo</DialogTitle>
                    <DialogDescription className="flex flex-wrap items-baseline gap-x-1">
                        <span>Adicione ou remova produtos da comanda de</span>
                        <span className="font-semibold text-foreground">{session?.responsible}.</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 min-h-0 flex-grow overflow-hidden">
                    {/* Left Panel: Product List */}
                    <div className="flex flex-col border rounded-lg overflow-hidden">
                        <div className="p-4 border-b">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Buscar produto..." 
                                    className="pl-10"
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                />
                            </div>
                        </div>
                        <ScrollArea className="flex-grow">
                            <div className="p-4 space-y-2">
                                {isLoadingProducts ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="flex justify-between items-center p-2 rounded-lg">
                                            <Skeleton className="h-5 w-3/5" />
                                            <Skeleton className="h-5 w-1/5" />
                                        </div>
                                    ))
                                ) : availableProducts.map(product => (
                                    <button 
                                        key={product.id}
                                        onClick={() => handleUpdateQuantity(product.id, 1)}
                                        disabled={product.stock <= 0 || !!isUpdatingItem}
                                        className={cn(
                                            "w-full flex justify-between items-center p-2 rounded-lg text-left transition-colors",
                                            product.stock > 0 ? "hover:bg-muted" : "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        <div className="flex-grow min-w-0 pr-2">
                                            <p className="font-medium truncate">{product.name}</p>
                                            <p className="text-xs text-muted-foreground">Estoque: {product.stock}</p>
                                        </div>
                                        <p className="font-semibold shrink-0">{formatCurrency(product.price)}</p>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Right Panel: Current Order */}
                    <div className="flex flex-col border rounded-lg bg-muted/30 overflow-hidden">
                        <div className="p-4 border-b">
                            <h3 className="font-semibold text-lg flex items-center gap-2"><ShoppingBag className="h-5 w-5"/>Comanda Atual</h3>
                        </div>
                        <ScrollArea className="flex-grow">
                            <div className="p-4 space-y-3">
                            {comanda.length === 0 ? (
                                <div className="text-center text-muted-foreground py-10">
                                    <p>Nenhum item na comanda.</p>
                                    <p className="text-xs">Clique em um produto à esquerda para adicionar.</p>
                                </div>
                            ) : comanda.map(item => (
                                <div key={item.productId} className="flex items-center gap-4 bg-background p-2 rounded-md shadow-sm">
                                    <div className="flex-grow min-w-0">
                                        <p className="font-medium truncate">{item.name}</p>
                                        <p className="text-sm font-mono">{formatCurrency(item.price * item.quantity)}</p>
                                    </div>
                                    <div className="flex items-center gap-2 border rounded-md">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUpdateQuantity(item.productId, -1)} disabled={isUpdatingItem === item.productId || !!isUpdatingItem}>
                                            <Minus className="h-4 w-4" />
                                        </Button>
                                        <span className="font-bold w-4 text-center">{isUpdatingItem === item.productId ? <Loader2 className="h-4 w-4 animate-spin mx-auto"/> : item.quantity}</span>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUpdateQuantity(item.productId, 1)} disabled={isUpdatingItem === item.productId || !!isUpdatingItem}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleRemoveItem(item.productId)} disabled={isUpdatingItem === item.productId || !!isUpdatingItem}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            </div>
                        </ScrollArea>
                        <div className="p-4 border-t mt-auto">
                            <Separator className="my-2"/>
                            <div className="flex justify-between items-center font-bold text-lg">
                                <span>Subtotal</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 pt-4 border-t">
                    <Button variant="outline" onClick={handleClose} disabled={isSaving || !!isUpdatingItem}>Cancelar</Button>
                    <Button onClick={handleConfirm} disabled={isSaving || !!isUpdatingItem}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
