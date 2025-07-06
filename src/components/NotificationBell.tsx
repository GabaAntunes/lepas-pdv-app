
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
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

export function NotificationBell() {
  const { notifications, deleteNotification, deleteAllNotifications, hasNewNotification, setHasNewNotification } = useNotifications();
  const router = useRouter();

  useEffect(() => {
    if(hasNewNotification) {
      // Reset the animation trigger after a short delay
      const timer = setTimeout(() => setHasNewNotification(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [hasNewNotification, setHasNewNotification]);

  const handleNotificationClick = (link: string, id: string) => {
    router.push(link);
    deleteNotification(id);
  };

  const hasNotifications = notifications.length > 0;
  const bellAnimation = {
    rest: { rotate: 0 },
    shake: { rotate: [0, -15, 10, -10, 5, -5, 0], transition: { duration: 0.5 } }
  };

  const badgeAnimation = {
      initial: { scale: 0, opacity: 0 },
      animate: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 500, damping: 30 } },
      exit: { scale: 0, opacity: 0 }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <motion.div animate={hasNewNotification ? "shake" : "rest"} variants={bellAnimation}>
            <Bell className="h-[1.2rem] w-[1.2rem]" />
          </motion.div>
          <AnimatePresence>
          {hasNotifications && (
            <motion.span
              variants={badgeAnimation}
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground"
            >
              {notifications.length}
            </motion.span>
          )}
          </AnimatePresence>
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
