
"use client";

import { Bell, AlertTriangle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/contexts/NotificationContext";
import { useRouter } from "next/navigation";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "./ui/tooltip";

export function NotificationBell() {
  const { notifications, deleteNotification, deleteAllNotifications } = useNotifications();
  const router = useRouter();

  const handleNotificationClick = (link: string, id: string) => {
    router.push(link);
    deleteNotification(id);
  };

  const hasNotifications = notifications.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-[1.2rem] w-[1.2rem]" />
          {hasNotifications && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
              {notifications.length}
            </span>
          )}
          <span className="sr-only">Toggle notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2">
            <DropdownMenuLabel className="p-0">Notificações</DropdownMenuLabel>
            {hasNotifications && (
                <Button variant="ghost" size="sm" onClick={() => deleteAllNotifications()}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Limpar todas
                </Button>
            )}
        </div>
        <DropdownMenuSeparator />
        {hasNotifications ? (
            <ScrollArea className="h-auto max-h-80">
            {notifications.map((notification) => (
                <DropdownMenuItem 
                    key={notification.id} 
                    className="flex items-start gap-3 p-2 cursor-pointer"
                    onClick={() => handleNotificationClick(notification.link, notification.id)}
                    onSelect={(e) => e.preventDefault()} // Prevent menu from closing
                >
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-1 flex-shrink-0" />
                    <p className="flex-grow text-sm text-wrap pr-4">{notification.message}</p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 shrink-0" 
                              onClick={(e) => {
                                  e.stopPropagation(); // Prevent DropdownMenuItem click
                                  deleteNotification(notification.id);
                              }}>
                              <X className="h-4 w-4"/>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Dispensar</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                </DropdownMenuItem>
            ))}
            </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mb-2" />
            <p className="text-sm">Nenhuma notificação nova.</p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
