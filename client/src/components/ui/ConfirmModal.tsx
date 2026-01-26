import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
} from './dialog';
import { Button } from './button';
import { FiAlertTriangle, FiInfo, FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi';

export type ConfirmModalVariant = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    message: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmModalVariant;
    isLoading?: boolean;
    showIcon?: boolean;
}

const variantConfig: Record<ConfirmModalVariant, {
    icon: React.ReactNode;
    iconBg: string;
    confirmBtnClass: string;
}> = {
    danger: {
        icon: <FiXCircle className="w-6 h-6 text-red-600" />,
        iconBg: 'bg-red-100 dark:bg-red-900/30',
        confirmBtnClass: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
        icon: <FiAlertTriangle className="w-6 h-6 text-amber-600" />,
        iconBg: 'bg-amber-100 dark:bg-amber-900/30',
        confirmBtnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    info: {
        icon: <FiInfo className="w-6 h-6 text-blue-600" />,
        iconBg: 'bg-blue-100 dark:bg-blue-900/30',
        confirmBtnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    success: {
        icon: <FiCheckCircle className="w-6 h-6 text-green-600" />,
        iconBg: 'bg-green-100 dark:bg-green-900/30',
        confirmBtnClass: 'bg-green-600 hover:bg-green-700 text-white',
    },
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'নিশ্চিত করুন',
    cancelText = 'বাতিল',
    variant = 'warning',
    isLoading = false,
    showIcon = true,
}) => {
    const config = variantConfig[variant];

    const handleConfirm = async () => {
        await onConfirm();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-start gap-4">
                        {showIcon && (
                            <div className={`p-3 rounded-full ${config.iconBg}`}>
                                {config.icon}
                            </div>
                        )}
                        <div className="flex-1">
                            <DialogTitle className="text-lg font-semibold">
                                {title}
                            </DialogTitle>
                            <DialogDescription className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                {message}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                <DialogFooter className="mt-4 gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                        className="w-full sm:w-auto"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={`w-full sm:w-auto ${config.confirmBtnClass}`}
                    >
                        {isLoading ? (
                            <>
                                <FiLoader className="w-4 h-4 mr-2 animate-spin" />
                                অপেক্ষা করুন...
                            </>
                        ) : (
                            confirmText
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// Hook for easier usage
interface UseConfirmModalReturn {
    isOpen: boolean;
    open: (config: Omit<ConfirmModalProps, 'isOpen' | 'onClose' | 'onConfirm'>) => Promise<boolean>;
    close: () => void;
    ConfirmModalComponent: React.FC;
}

export const useConfirmModal = (): UseConfirmModalReturn => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [config, setConfig] = React.useState<Omit<ConfirmModalProps, 'isOpen' | 'onClose' | 'onConfirm'>>({
        title: '',
        message: '',
    });
    const resolverRef = React.useRef<((value: boolean) => void) | null>(null);

    const open = React.useCallback((newConfig: typeof config): Promise<boolean> => {
        setConfig(newConfig);
        setIsOpen(true);
        return new Promise((resolve) => {
            resolverRef.current = resolve;
        });
    }, []);

    const close = React.useCallback(() => {
        setIsOpen(false);
        if (resolverRef.current) {
            resolverRef.current(false);
            resolverRef.current = null;
        }
    }, []);

    const handleConfirm = React.useCallback(() => {
        setIsOpen(false);
        if (resolverRef.current) {
            resolverRef.current(true);
            resolverRef.current = null;
        }
    }, []);

    const ConfirmModalComponent: React.FC = React.useCallback(() => (
        <ConfirmModal
            {...config}
            isOpen={isOpen}
            onClose={close}
            onConfirm={handleConfirm}
        />
    ), [config, isOpen, close, handleConfirm]);

    return { isOpen, open, close, ConfirmModalComponent };
};

export default ConfirmModal;
