import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Bitcoin, Wallet, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface CryptoOption {
  chain: string;
  symbol: string;
  name: string;
  address: string;
  color: string;
  bgColor: string;
  logo: string;
}

const CRYPTO_OPTIONS: CryptoOption[] = [
  {
    chain: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0x75B30d0dE751D9628510f3cb273F09f7137f9E3F',
    color: '#627EEA',
    bgColor: 'rgba(98, 126, 234, 0.1)',
    logo: '◆',
  },
  {
    chain: 'bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    address: 'bc1qn67f2d50wng6h83cxsk7kc55yux7kv4l6dugrx',
    color: '#F7931A',
    bgColor: 'rgba(247, 147, 26, 0.1)',
    logo: '₿',
  },
  {
    chain: 'solana',
    symbol: 'SOL',
    name: 'Solana',
    address: '5i6AY6jYFhGj2KThPQZiWtSV7jAQRZjtSvv2vfHmuQiU',
    color: '#9945FF',
    bgColor: 'rgba(153, 69, 255, 0.1)',
    logo: '◎',
  },
  {
    chain: 'tron',
    symbol: 'TRX',
    name: 'Tron',
    address: 'TGRDDVFkCD88qtAyjrHz5UhjjGoArhzwfK',
    color: '#FF060A',
    bgColor: 'rgba(255, 6, 10, 0.1)',
    logo: 'T',
  },
  {
    chain: 'bnb',
    symbol: 'BNB',
    name: 'BNB Chain',
    address: '0x75B30d0dE751D9628510f3cb273F09f7137f9E3F',
    color: '#F3BA2F',
    bgColor: 'rgba(243, 186, 47, 0.1)',
    logo: 'B',
  },
  {
    chain: 'polygon',
    symbol: 'MATIC',
    name: 'Polygon',
    address: '0x75B30d0dE751D9628510f3cb273F09f7137f9E3F',
    color: '#8247E5',
    bgColor: 'rgba(130, 71, 229, 0.1)',
    logo: '⬡',
  },
  {
    chain: 'linea',
    symbol: 'ETH',
    name: 'Linea',
    address: '0x75B30d0dE751D9628510f3cb273F09f7137f9E3F',
    color: '#121212',
    bgColor: 'rgba(18, 18, 18, 0.1)',
    logo: 'L',
  },
  {
    chain: 'base',
    symbol: 'ETH',
    name: 'Base',
    address: '0x75B30d0dE751D9628510f3cb273F09f7137f9E3F',
    color: '#0052FF',
    bgColor: 'rgba(0, 82, 255, 0.1)',
    logo: '●',
  },
  {
    chain: 'arbitrum',
    symbol: 'ETH',
    name: 'Arbitrum',
    address: '0x75B30d0dE751D9628510f3cb273F09f7137f9E3F',
    color: '#28A0F0',
    bgColor: 'rgba(40, 160, 240, 0.1)',
    logo: 'Λ',
  },
  {
    chain: 'optimism',
    symbol: 'ETH',
    name: 'Optimism',
    address: '0x75B30d0dE751D9628510f3cb273F09f7137f9E3F',
    color: '#FF0420',
    bgColor: 'rgba(255, 4, 32, 0.1)',
    logo: 'O',
  },
];

const PRICING: Record<string, number> = {
  pro: 29,
  enterprise: 299,
};

interface CryptoPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: string;
  tierName: string;
}

export default function CryptoPaymentModal({ isOpen, onClose, tier, tierName }: CryptoPaymentModalProps) {
  const [selectedChain, setSelectedChain] = useState<CryptoOption | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const amount = PRICING[tier] || 0;

  const handleCopy = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = address;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const generateQRUrl = (chain: CryptoOption) => {
    // Generate a simple QR code URL using an API
    const paymentUrl = encodeURIComponent(chain.address);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${paymentUrl}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative p-6 pb-4 border-b border-slate-200 dark:border-slate-700">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500 to-sky-500">
                  <Bitcoin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Pay with Crypto
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {tierName} — ${amount}/month
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {!selectedChain ? (
                /* Chain Selection */
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Select a blockchain:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {CRYPTO_OPTIONS.map((chain) => (
                      <button
                        key={chain.chain}
                        onClick={() => setSelectedChain(chain)}
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-400 transition-all hover:shadow-md text-left"
                        style={{ backgroundColor: chain.bgColor }}
                      >
                        <span
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: chain.color }}
                        >
                          {chain.logo}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {chain.name}
                          </p>
                          <p className="text-xs text-slate-500">{chain.symbol}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Payment Details */
                <div className="space-y-5">
                  {/* Back button */}
                  <button
                    onClick={() => { setSelectedChain(null); setShowQR(false); }}
                    className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1"
                  >
                    ← Back to chains
                  </button>

                  {/* Selected chain info */}
                  <div
                    className="flex items-center gap-3 p-4 rounded-xl"
                    style={{ backgroundColor: selectedChain.bgColor }}
                  >
                    <span
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: selectedChain.color }}
                    >
                      {selectedChain.logo}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {selectedChain.name}
                      </p>
                      <p className="text-sm text-slate-500">{selectedChain.symbol}</p>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-center p-4 rounded-xl bg-gradient-to-r from-teal-50 to-sky-50 dark:from-teal-900/20 dark:to-sky-900/20 border border-teal-200 dark:border-teal-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Amount to pay</p>
                    <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">
                      ${amount}
                      <span className="text-sm font-normal text-slate-500 ml-2">/month</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Send equivalent in {selectedChain.symbol}
                    </p>
                  </div>

                  {/* QR Code Toggle */}
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <QrCode className="w-4 h-4" />
                    <span className="text-sm">{showQR ? 'Hide QR Code' : 'Show QR Code'}</span>
                  </button>

                  {/* QR Code */}
                  <AnimatePresence>
                    {showQR && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="flex justify-center"
                      >
                        <img
                          src={generateQRUrl(selectedChain)}
                          alt="Payment QR Code"
                          className="w-48 h-48 rounded-xl border border-slate-200 dark:border-slate-700"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Wallet Address */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Wallet Address
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs break-all text-slate-700 dark:text-slate-300">
                        {selectedChain.address}
                      </div>
                      <button
                        onClick={() => handleCopy(selectedChain.address)}
                        className="p-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white transition-colors flex-shrink-0"
                        title="Copy address"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                      ⚠️ Important
                    </p>
                    <ol className="mt-2 text-xs text-amber-700 dark:text-amber-400 space-y-1 list-decimal list-inside">
                      <li>Send only {selectedChain.symbol} on {selectedChain.name}</li>
                      <li>Include your email in the transaction memo (if supported)</li>
                      <li>Contact support@enviroswarm.app with tx hash after payment</li>
                      <li>Access will be activated within 24 hours of confirmation</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <Wallet className="w-3 h-3" />
                <span>Decentralized. Secure. No middlemen.</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
