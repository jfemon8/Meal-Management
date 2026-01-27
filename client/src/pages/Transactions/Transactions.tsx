import React, { useState, useEffect, type ChangeEvent } from 'react';
import { transactionService } from '../../services/mealService';
import { formatDateTimeShort } from '../../utils/dateUtils';
import { FiArrowUp, FiArrowDown, FiFilter } from 'react-icons/fi';

// ============================================
// Types
// ============================================

type TransactionType = 'deposit' | 'deduction' | 'adjustment' | 'refund';
type BalanceType = 'breakfast' | 'lunch' | 'dinner';

interface Transaction {
  _id: string;
  type: TransactionType;
  balanceType: BalanceType;
  amount: number;
  description: string;
  newBalance: number;
  createdAt: string;
}

interface TransactionPagination {
  page: number;
  pages: number;
}

interface TransactionFilter {
  balanceType: string;
  startDate: string;
  endDate: string;
  page: number;
}

interface TransactionsResponse {
  transactions: Transaction[];
  pagination: TransactionPagination;
}

// ============================================
// Component
// ============================================

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<TransactionPagination>({ page: 1, pages: 1 });
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<TransactionFilter>({
    balanceType: '',
    startDate: '',
    endDate: '',
    page: 1,
  });

  useEffect(() => {
    loadTransactions();
  }, [filter]);

  const loadTransactions = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = (await transactionService.getTransactions({
        balanceType: (filter.balanceType || undefined) as BalanceType | undefined,
        startDate: filter.startDate || undefined,
        endDate: filter.endDate || undefined,
        page: filter.page,
        limit: 20,
      })) as unknown as TransactionsResponse;
      setTransactions(response.transactions);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: TransactionType): string => {
    switch (type) {
      case 'deposit':
        return 'text-green-600';
      case 'deduction':
        return 'text-red-600';
      case 'adjustment':
        return 'text-blue-600';
      case 'refund':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTypeLabel = (type: TransactionType): string => {
    switch (type) {
      case 'deposit':
        return 'জমা';
      case 'deduction':
        return 'কাটা';
      case 'adjustment':
        return 'সমন্বয়';
      case 'refund':
        return 'ফেরত';
      default:
        return type;
    }
  };

  const getBalanceTypeLabel = (type: BalanceType): string => {
    switch (type) {
      case 'breakfast':
        return 'নাস্তা';
      case 'lunch':
        return 'দুপুর';
      case 'dinner':
        return 'রাত';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">লেনদেন</h1>
      </div>

      {/* Filter */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          <FiFilter className="text-gray-400" />
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">ব্যালেন্স টাইপ</label>
            <select
              value={filter.balanceType}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setFilter({ ...filter, balanceType: e.target.value, page: 1 })
              }
              className="input"
            >
              <option value="">সব ধরনের</option>
              <option value="breakfast">নাস্তা</option>
              <option value="lunch">দুপুর</option>
              <option value="dinner">রাত</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">শুরুর তারিখ</label>
            <input
              type="date"
              value={filter.startDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFilter({ ...filter, startDate: e.target.value, page: 1 })
              }
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">শেষের তারিখ</label>
            <input
              type="date"
              value={filter.endDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFilter({ ...filter, endDate: e.target.value, page: 1 })
              }
              className="input"
            />
          </div>
          {(filter.balanceType || filter.startDate || filter.endDate) && (
            <button
              onClick={() => setFilter({ balanceType: '', startDate: '', endDate: '', page: 1 })}
              className="btn btn-outline text-sm mt-4"
            >
              ফিল্টার রিসেট
            </button>
          )}
        </div>
      </div>

      {/* Transactions List */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-center text-gray-500 py-8">কোন লেনদেন পাওয়া যায়নি</p>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div
                key={transaction._id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-2 rounded-full ${
                      transaction.type === 'deposit' ? 'bg-green-100' : 'bg-red-100'
                    }`}
                  >
                    {transaction.type === 'deposit' ? (
                      <FiArrowUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <FiArrowDown className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-gray-500">
                      {getBalanceTypeLabel(transaction.balanceType)} •{' '}
                      {formatDateTimeShort(new Date(transaction.createdAt))}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${getTypeColor(transaction.type)}`}>
                    {transaction.amount > 0 ? '+' : ''}৳{transaction.amount}
                  </p>
                  <p className="text-xs text-gray-400">ব্যালেন্স: ৳{transaction.newBalance}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setFilter({ ...filter, page: filter.page - 1 })}
              disabled={filter.page === 1}
              className="btn btn-outline disabled:opacity-50"
            >
              আগে
            </button>
            <span className="px-4">
              পৃষ্ঠা {pagination.page} / {pagination.pages}
            </span>
            <button
              onClick={() => setFilter({ ...filter, page: filter.page + 1 })}
              disabled={filter.page === pagination.pages}
              className="btn btn-outline disabled:opacity-50"
            >
              পরে
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;
