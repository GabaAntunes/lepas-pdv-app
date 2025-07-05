
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { useEffect, useState } from "react";
import { Product } from "@/types";
import { addProduct, deleteProduct, getProducts, updateProduct } from "@/services/productService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ProductForm, ProductFormValues } from "./ProductForm";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "../ui/skeleton";
import { BlurFade } from "../magicui/blur-fade";

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function ProductsSettings() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const { toast } = useToast();

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const productsData = await getProducts();
      setProducts(productsData);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar produtos",
        description: "Não foi possível buscar os produtos do banco de dados.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleFormSubmit = async (values: ProductFormValues) => {
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, values);
        toast({ title: "Produto atualizado com sucesso!" });
      } else {
        await addProduct(values);
        toast({ title: "Produto adicionado com sucesso!" });
      }
      await fetchProducts();
      closeDialog();
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar produto",
        description: "Ocorreu um erro. Tente novamente.",
      });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteProduct(id);
      toast({ title: "Produto excluído com sucesso!" });
      await fetchProducts();
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir produto",
        description: "Ocorreu um erro. Tente novamente.",
      });
    }
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  }

  const openNewDialog = () => {
    setEditingProduct(undefined);
    setIsFormOpen(true);
  }

  const closeDialog = () => {
    setIsFormOpen(false);
    setEditingProduct(undefined);
  }

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <Card>
      <CardHeader>
        <BlurFade delay={0.15}>
          <CardTitle className="font-headline">Produtos</CardTitle>
        </BlurFade>
        <BlurFade delay={0.25}>
          <CardDescription>Gerencie os produtos vendidos no seu estabelecimento.</CardDescription>
        </BlurFade>
      </CardHeader>
      <CardContent>
        <BlurFade delay={0.35}>
          <div className="flex items-center justify-between gap-4 mb-4">
            <Input 
              placeholder="Filtrar produtos..." 
              className="max-w-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNewDialog}><PlusCircle className="mr-2 h-4 w-4"/>Adicionar Produto</Button>
              </DialogTrigger>
              <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.target instanceof HTMLElement && e.closest('[role="alertdialog"]') ? e.preventDefault() : closeDialog()} onEscapeKeyDown={closeDialog}>
                <DialogHeader>
                  <DialogTitle>{editingProduct ? "Editar Produto" : "Adicionar Novo Produto"}</DialogTitle>
                </DialogHeader>
                <ProductForm 
                  initialData={editingProduct} 
                  onSubmit={handleFormSubmit}
                  onCancel={closeDialog}
                />
              </DialogContent>
            </Dialog>
          </div>
        </BlurFade>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead><span className="sr-only">Ações</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((product, idx) => (
                  <BlurFade as="tr" key={product.id} delay={0.45 + idx * 0.05}>
                    <TableRow>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{formatCurrency(product.price)}</TableCell>
                      <TableCell>{product.stock}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(product)}>
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
                                    Essa ação não pode ser desfeita. Isso excluirá permanentemente o produto.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteProduct(product.id)} variant="destructive">
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  </BlurFade>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    Nenhum produto encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
