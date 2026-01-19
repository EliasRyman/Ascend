import React, { createContext, useContext, useState, ReactNode } from 'react';

type ModalType = 'privacy' | 'terms' | 'cookies' | null;

interface LegalContextType {
    activeModal: ModalType;
    openModal: (type: ModalType) => void;
    closeModal: () => void;
}

const LegalContext = createContext<LegalContextType | undefined>(undefined);

export const LegalProvider = ({ children }: { children: ReactNode }) => {
    const [activeModal, setActiveModal] = useState<ModalType>(null);

    const openModal = (type: ModalType) => setActiveModal(type);
    const closeModal = () => setActiveModal(null);

    return (
        <LegalContext.Provider value={{ activeModal, openModal, closeModal }}>
            {children}
        </LegalContext.Provider>
    );
};

export const useLegal = () => {
    const context = useContext(LegalContext);
    if (context === undefined) {
        throw new Error('useLegal must be used within a LegalProvider');
    }
    return context;
};
