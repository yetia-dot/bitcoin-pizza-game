import { ethers } from 'ethers';

const STORAGE_KEY = 'pzza_identity_v1';

export class BurnerWallet {
    constructor() {
        this.wallet = null;
    }

    // Load or Generate Wallet
    getWallet() {
        if (this.wallet) return this.wallet;

        const storedKey = localStorage.getItem(STORAGE_KEY);

        if (storedKey) {
            try {
                this.wallet = new ethers.Wallet(storedKey);
                console.log("[Identity] Loaded existing chef:", this.wallet.address);
            } catch (e) {
                console.error("Corrupt key found, creating new identity.", e);
                this.generateNewWallet();
            }
        } else {
            this.generateNewWallet();
        }

        return this.wallet;
    }

    generateNewWallet() {
        // Safety Check: Double check before overwriting (though assumes caller uses getWallet first usually)
        if (localStorage.getItem(STORAGE_KEY)) {
            console.warn("Identity already exists. Using existing."); // Fallback safety
            this.wallet = new ethers.Wallet(localStorage.getItem(STORAGE_KEY));
            return;
        }

        console.log("[Identity] Minting new burner identity...");
        const newWallet = ethers.Wallet.createRandom();
        localStorage.setItem(STORAGE_KEY, newWallet.privateKey);
        this.wallet = newWallet;
    }

    getAddress() {
        return this.getWallet().address;
    }

    // Clear Logic (for debug or user reset)
    burnIdentity() {
        localStorage.removeItem(STORAGE_KEY);
        this.wallet = null;
        window.location.reload();
    }
}

export const burnerManager = new BurnerWallet();
