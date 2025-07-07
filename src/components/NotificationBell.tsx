
"use client";

import { Bell, AlertTriangle, Trash2, X, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/contexts/NotificationContext";
import { useRouter } from "next/navigation";
import { ScrollArea } from "./ui/scroll-area";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const notificationIcons: { [key: string]: React.ReactNode } = {
  stock: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  timeUp: <Timer className="h-5 w-5 text-red-500" />,
  default: <Bell className="h-5 w-5 text-muted-foreground" />,
};

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
    deleteNotification(id); // Delete on click
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
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between p-3 border-b">
            <h3 className="text-sm font-semibold">Notificações</h3>
            {hasNotifications && (
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); deleteAllNotifications(); }}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Limpar todas
                </Button>
            )}
        </div>

        {hasNotifications ? (
            <ScrollArea className="h-auto max-h-[400px]">
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                    key={notification.id}
                    className="flex items-start gap-4 p-3 hover:bg-muted cursor-pointer transition-colors relative group"
                    onClick={() => handleNotificationClick(notification.link, notification.id)}
                >
                    <div className="flex-shrink-0 mt-1">
                        {notificationIcons[notification.type] || notificationIcons.default}
                    </div>
                    <div className="flex-grow">
                        <p className="text-sm text-foreground pr-6">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: ptBR })}
                        </p>
                    </div>
                     <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 absolute top-2 right-2"
                        onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                        }}
                     >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Dispensar</span>
                    </Button>
                </div>
              ))}
            </div>
            </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mb-2" />
            <p className="text-sm font-semibold">Nenhuma notificação nova.</p>
            <p className="text-xs">Você está em dia!</p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
