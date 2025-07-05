
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useEffect, useState, useCallback } from "react";
import { Coupon } from "@/types";
import { addCoupon, deleteCoupon, getCoupons, updateCoupon } from "@/services/couponService";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CouponForm, CouponFormValues } from "@/components/settings/CouponForm";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsHeader } from "@/components/settings/SettingsHeader";
import { format } from "date-fns";

const formatDiscount = (coupon: Coupon) => {
    if (coupon.discountType === 'fixed') {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(coupon.discountValue);
    }
    if (coupon.discountType === 'freeTime') {
        return `${coupon.discountValue} min`;
    }
    return `${coupon.discountValue}%`;
}

const getCouponStatus = (coupon: Coupon): { text: string; className: string } => {
    if (coupon.status === 'inactive') {
        return { text: 'Inativo', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' };
    }
    if (coupon.validUntil && coupon.validUntil < Date.now()) {
        return { text: 'Expirado', className: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' };
    }
    if (coupon.usageLimit && coupon.usageLimit > 0 && coupon.uses >= coupon.usageLimit) {
        return { text: 'Esgotado', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' };
    }
    return { text: 'Ativo', className: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' };
};


export default function CouponsSettingsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | undefined>(undefined);
  const { toast } = useToast();

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const couponsData = await getCoupons();
      setCoupons(couponsData);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar cupons",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleFormSubmit = async (values: CouponFormValues) => {
    try {
      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, values);
        toast({ title: "Cupom atualizado com sucesso!" });
      } else {
        await addCoupon(values);
        toast({ title: "Cupom adicionado com sucesso!" });
      }
      await fetchCoupons();
      closeDialog();
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar cupom",
      });
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    try {
      await deleteCoupon(id);
      toast({ title: "Cupom excluído com sucesso!" });
      await fetchCoupons();
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir cupom",
      });
    }
  };

  const openEditDialog = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setIsFormOpen(true);
  };

  const openNewDialog = () => {
    setEditingCoupon(undefined);
    setIsFormOpen(true);
  };

  const closeDialog = () => {
    setIsFormOpen(false);
    setEditingCoupon(undefined);
  };

  const filteredCoupons = coupons.filter(c => c.code.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="min-h-screen bg-muted/40">
      <SettingsHeader title="Gerenciar Cupons" showBackButton />
      <main className="p-6">
        <Card className="max-w-6xl mx-auto">
          <CardHeader>
            <CardTitle>Cupons de Desconto</CardTitle>
            <CardDescription>Crie e gerencie seus cupons de desconto.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 mb-4">
              <Input 
                placeholder="Filtrar cupons..." 
                className="max-w-sm"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openNewDialog}><PlusCircle className="mr-2 h-4 w-4"/>Adicionar Cupom</Button>
                </DialogTrigger>
                <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} onPointerDownOutside={(e) => { if (e.target instanceof HTMLElement && e.closest('[role="alertdialog"]')) { e.preventDefault() } else { closeDialog() } }} onEscapeKeyDown={closeDialog}>
                  <DialogHeader>
                    <DialogTitle>{editingCoupon ? "Editar Cupom" : "Adicionar Novo Cupom"}</DialogTitle>
                  </DialogHeader>
                  <CouponForm 
                    initialData={editingCoupon} 
                    onSubmit={handleFormSubmit}
                    onCancel={closeDialog}
                  />
                </DialogContent>
              </Dialog>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Usos</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead><span className="sr-only">Ações</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}><Skeleton className="h-5 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredCoupons.length > 0 ? (
                    filteredCoupons.map((coupon) => {
                      const status = getCouponStatus(coupon);
                      return (
                      <TableRow key={coupon.id}>
                        <TableCell className="font-medium font-code">{coupon.code}</TableCell>
                        <TableCell>{coupon.discountType === 'fixed' ? 'Valor Fixo' : coupon.discountType === 'percentage' ? 'Percentual' : 'Tempo Grátis'}</TableCell>
                        <TableCell>{formatDiscount(coupon)}</TableCell>
                        <TableCell>{coupon.usageLimit ? `${coupon.uses} / ${coupon.usageLimit}` : coupon.uses}</TableCell>
                        <TableCell>{coupon.validUntil ? format(coupon.validUntil, 'dd/MM/yyyy') : 'Não expira'}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs rounded-full ${status.className}`}>
                            {status.text}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(coupon)}>
                                Editar
                              </DropdownMenuItem>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive-foreground focus:bg-destructive">
                                    Excluir
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Essa ação não pode ser desfeita. Isso excluirá permanentemente o cupom.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteCoupon(coupon.id)} variant="destructive">
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )})
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">
                        Nenhum cupom encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
