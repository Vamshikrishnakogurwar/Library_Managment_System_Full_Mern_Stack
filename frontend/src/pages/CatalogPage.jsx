import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Plus,
  Filter,
  BookOpen,
  Layers,
  CheckCircle2,
  AlertCircle,
  X,
  Edit3,
  Percent,
  ShoppingBag,
  Repeat,
  Package,
  TrendingDown,
  TrendingUp,
  Tag,
  DollarSign,
  Sparkles
} from 'lucide-react';

export function CatalogPage() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showRentModal, setShowRentModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);

  const [activeBook, setActiveBook] = useState(null);
  const [bookDetails, setBookDetails] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Add Book Form state
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    isbn: '',
    category_id: '',
    edition: '1st Edition',
    publisher: '',
    publication_year: new Date().getFullYear(),
    replacement_cost: 499,
    discount_percentage: 0,
    initial_copies: 3,
    rack_location: 'Main Stacks',
    description: '',
  });

  // Edit Book Form state (Admin only)
  const [editForm, setEditForm] = useState({
    title: '',
    author: '',
    publisher: '',
    edition: '',
    category_id: '',
    publication_year: new Date().getFullYear(),
    replacement_cost: 0,
    discount_percentage: 0,
    description: '',
  });

  // Stock Adjustment state (Admin only)
  const [stockDelta, setStockDelta] = useState(1);
  const [stockAction, setStockAction] = useState('ADD'); // 'ADD' or 'REMOVE'
  const [stockNotes, setStockNotes] = useState('Stock restock');

  // Rent and Buy state (Customer / Admin)
  const [rentingCopyId, setRentingCopyId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ error: '', success: '' });

  const isAdminOrLibrarian = user && (user.role === 'ADMIN' || user.role === 'LIBRARIAN');
  const isAdmin = user && user.role === 'ADMIN';
  const isCustomer = user && user.role === 'CUSTOMER';

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (selectedCategory) params.categoryId = selectedCategory;

      const res = await api.getBooks(params);
      if (res.success) {
        setBooks(res.data.books);
        setTotal(res.data.total);
      }
    } catch (err) {
      console.error('Catalog fetch failed:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.getCategories();
      if (res.success) setCategories(res.data);
    } catch (err) {
      console.error('Categories fetch failed:', err.message);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCatalog();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedCategory]);

  const openBookDetails = async (book, modalType) => {
    setActiveBook(book);
    setModalLoading(true);
    setFeedback({ error: '', success: '' });
    try {
      const res = await api.getBookById(book.id);
      if (res.success) {
        setBookDetails(res.data);
        if (modalType === 'EDIT') {
          setEditForm({
            title: res.data.title || '',
            author: res.data.author || '',
            publisher: res.data.publisher || '',
            edition: res.data.edition || '',
            category_id: res.data.category_id || '',
            publication_year: res.data.publication_year || new Date().getFullYear(),
            replacement_cost: parseFloat(res.data.replacement_cost) || 0,
            discount_percentage: parseFloat(res.data.discount_percentage) || 0,
            description: res.data.description || '',
          });
          setShowEditModal(true);
        } else if (modalType === 'STOCK') {
          setShowStockModal(true);
        } else if (modalType === 'RENT') {
          const avail = res.data.copies?.find((c) => c.status === 'AVAILABLE');
          if (avail) setRentingCopyId(avail.id);
          setShowRentModal(true);
        } else if (modalType === 'BUY') {
          setShowBuyModal(true);
        }
      }
    } catch (err) {
      setFeedback({ error: err.message, success: '' });
    } finally {
      setModalLoading(false);
    }
  };

  // 1. Create Book Handler
  const handleCreateBook = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback({ error: '', success: '' });

    try {
      const payload = {
        ...newBook,
        category_id: newBook.category_id ? parseInt(newBook.category_id, 10) : null,
        publication_year: newBook.publication_year ? parseInt(newBook.publication_year, 10) : null,
        replacement_cost: parseFloat(newBook.replacement_cost) || 499,
        discount_percentage: parseFloat(newBook.discount_percentage) || 0,
        initial_copies: parseInt(newBook.initial_copies, 10) || 1,
      };

      const res = await api.createBook(payload);
      if (res.success) {
        setFeedback({ success: `Book '${newBook.title}' created with ${newBook.initial_copies} initial copies!`, error: '' });
        setShowAddModal(false);
        setNewBook({
          title: '',
          author: '',
          isbn: '',
          category_id: '',
          edition: '1st Edition',
          publisher: '',
          publication_year: new Date().getFullYear(),
          replacement_cost: 499,
          discount_percentage: 0,
          initial_copies: 2,
          rack_location: 'General Stacks',
          description: '',
        });
        fetchCatalog();
      }
    } catch (err) {
      setFeedback({ error: err.message || 'Failed to create book', success: '' });
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Admin Edit Book & Discount Handler
  const handleUpdateBook = async (e) => {
    e.preventDefault();
    if (!activeBook) return;
    setSubmitting(true);
    setFeedback({ error: '', success: '' });

    try {
      const payload = {
        ...editForm,
        category_id: editForm.category_id ? parseInt(editForm.category_id, 10) : null,
        publication_year: editForm.publication_year ? parseInt(editForm.publication_year, 10) : null,
        replacement_cost: parseFloat(editForm.replacement_cost) || 0,
        discount_percentage: parseFloat(editForm.discount_percentage) || 0,
      };

      const res = await api.updateBook(activeBook.id, payload);
      if (res.success) {
        setFeedback({ success: `Updated '${editForm.title}' details & discount successfully!`, error: '' });
        setShowEditModal(false);
        fetchCatalog();
      }
    } catch (err) {
      setFeedback({ error: err.message || 'Update failed', success: '' });
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Admin Adjust Stock Handler
  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!activeBook) return;
    setSubmitting(true);
    setFeedback({ error: '', success: '' });

    try {
      const delta = stockAction === 'ADD' ? parseInt(stockDelta, 10) : -parseInt(stockDelta, 10);
      const res = await api.adjustStock(activeBook.id, {
        delta,
        rackLocation: 'General Stacks',
        notes: stockNotes.trim() || 'Inventory adjustment',
      });

      if (res.success) {
        setFeedback({
          success: `Stock for '${activeBook.title}' successfully updated by ${delta > 0 ? `+${delta}` : delta} copies!`,
          error: '',
        });
        setShowStockModal(false);
        fetchCatalog();
      }
    } catch (err) {
      setFeedback({ error: err.message || 'Stock adjustment failed', success: '' });
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Customer / Admin Rent Book Handler
  const handleRentBook = async (e) => {
    e.preventDefault();
    if (!bookDetails) return;
    setSubmitting(true);
    setFeedback({ error: '', success: '' });

    try {
      const copyId = parseInt(rentingCopyId, 10);
      if (!copyId) throw new Error('Please select an available physical copy barcode to borrow.');

      const payload = { copyId };
      // If admin is renting on behalf of a customer, pass customerId; if customer, backend auto-uses session profile
      if (isAdminOrLibrarian && user.customerProfileId) {
        payload.customerId = user.customerProfileId;
      }

      const res = await api.issueBook(payload);
      if (res.success) {
        setFeedback({
          success: `🎉 Success! Book '${bookDetails.title}' rented. Loan Code: ${res.data.loanCode}. Due Date: ${res.data.dueDate}`,
          error: '',
        });
        setShowRentModal(false);
        fetchCatalog();
      }
    } catch (err) {
      setFeedback({ error: err.message || 'Rental request could not be processed', success: '' });
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Customer / Admin Purchase Book Handler
  const handleBuyBook = async (e) => {
    e.preventDefault();
    if (!bookDetails) return;
    setSubmitting(true);
    setFeedback({ error: '', success: '' });

    try {
      const res = await api.purchaseBook(bookDetails.id, {
        paymentMethod,
        notes: `Direct purchase order for ${bookDetails.title}`,
      });

      if (res.success) {
        setFeedback({
          success: `🎉 Purchase complete! You purchased '${res.data.bookTitle}' for ₹${res.data.totalAmount} (Discount saved: ₹${res.data.discountAmount}). Invoice: ${res.data.invoiceNumber}`,
          error: '',
        });
        setShowBuyModal(false);
        fetchCatalog();
      }
    } catch (err) {
      setFeedback({ error: err.message || 'Purchase could not be completed', success: '' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner / Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-slate-900/10 border border-slate-700/50">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-400/30 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            {isAdmin ? 'ADMINISTRATIVE CONTROL PANEL' : isCustomer ? 'READER SERVICE PORTAL' : 'CIRCULATION DESK'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white">
            {isAdmin ? 'Book Catalog, Inventory & Pricing Desk' : 'Library Bookstore & Rental Catalog'}
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            {isAdmin
              ? 'Complete authority: update retail pricing, configure live book discounts, manage warehouse stock levels, and issue circulation records.'
              : 'Browse active titles in real-time. Choose to rent for standard loan cycles or buy outright with exclusive member discounts.'}
          </p>
        </div>

        {isAdminOrLibrarian && (
          <button
            onClick={() => {
              setFeedback({ error: '', success: '' });
              setShowAddModal(true);
            }}
            className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-sm font-bold shadow-lg shadow-sky-500/25 transition-all transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Title</span>
          </button>
        )}
      </div>

      {/* Global Feedback notification */}
      {feedback.success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{feedback.success}</span>
          </div>
          <button onClick={() => setFeedback({ ...feedback, success: '' })} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {feedback.error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span className="font-medium">{feedback.error}</span>
          </div>
          <button onClick={() => setFeedback({ ...feedback, error: '' })} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search and Category Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by title, author, ISBN barcode, or book ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
          />
        </div>
        <div className="w-full md:w-64">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-slate-500 font-medium px-2 whitespace-nowrap">
          Showing <span className="text-slate-900 font-bold">{books.length}</span> of {total} books
        </div>
      </div>

      {/* Modern Catalog Cards Grid */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600 mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading catalog records...</p>
        </div>
      ) : books.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {books.map((book) => {
            const avail = parseInt(book.available_copies || 0, 10);
            const totalCopies = parseInt(book.total_copies || 0, 10);
            const price = parseFloat(book.replacement_cost) || 499;
            const discountPct = parseFloat(book.discount_percentage) || 0;
            const finalPrice = Math.max(0, price - (price * discountPct) / 100);

            return (
              <div
                key={book.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-6">
                  {/* Category & Discount Tag */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 truncate">
                      {book.category_name || 'General'}
                    </span>
                    {discountPct > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
                        <Tag className="w-3 h-3" />
                        {discountPct}% OFF
                      </span>
                    )}
                  </div>

                  {/* Title & Author */}
                  <h3 className="font-bold text-lg text-slate-900 leading-snug line-clamp-1 group-hover:text-sky-600 transition-colors">
                    {book.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    By <span className="text-slate-700">{book.author}</span> {book.edition && `• ${book.edition}`}
                  </p>

                  {/* Pricing Display */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">Purchase Price</span>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-lg font-extrabold text-slate-900 font-mono">
                          ₹{finalPrice.toFixed(2)}
                        </span>
                        {discountPct > 0 && (
                          <span className="text-xs text-slate-400 line-through font-mono">
                            ₹{price.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 block font-medium">In Warehouse</span>
                      <div className="flex items-center justify-end space-x-1 mt-0.5">
                        <span className={`text-sm font-bold font-mono ${avail > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {avail}
                        </span>
                        <span className="text-xs text-slate-400">/ {totalCopies} copies</span>
                      </div>
                    </div>
                  </div>

                  {/* Description snippet */}
                  {book.description && (
                    <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed bg-slate-50/70 p-2.5 rounded-xl">
                      {book.description}
                    </p>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center gap-2">
                  {/* ADMIN POWERS */}
                  {isAdminOrLibrarian ? (
                    <>
                      <button
                        onClick={() => openBookDetails(book, 'STOCK')}
                        className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                      >
                        <Layers className="w-3.5 h-3.5 text-sky-600" />
                        <span>Manage Stock ({avail})</span>
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => openBookDetails(book, 'EDIT')}
                          className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                          <span>Price & Discount</span>
                        </button>
                      )}

                      {/* Staff Quick Rent button */}
                      <button
                        onClick={() => openBookDetails(book, 'RENT')}
                        disabled={avail === 0}
                        className="p-2 rounded-xl text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        title="Circulate / Issue Copy"
                      >
                        <Repeat className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    /* CUSTOMER POWERS: Rent or Buy */
                    <div className="w-full flex items-center gap-2">
                      <button
                        onClick={() => openBookDetails(book, 'RENT')}
                        disabled={avail === 0}
                        className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white border border-sky-300 text-sky-700 hover:bg-sky-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition"
                      >
                        <Repeat className="w-3.5 h-3.5 text-sky-600" />
                        <span>{avail > 0 ? 'Rent Book' : 'Out of Stock'}</span>
                      </button>

                      <button
                        onClick={() => openBookDetails(book, 'BUY')}
                        disabled={avail === 0}
                        className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-md shadow-sky-600/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Buy Book (₹{finalPrice.toFixed(0)})</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 text-slate-500">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300 stroke-1" />
          <p className="text-base font-bold text-slate-800">No books found matching criteria</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting search parameters or clear filters.</p>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: ADD BOOK TITLE (Admin / Librarian)
         ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Add New Book Title</h2>
                <p className="text-xs text-slate-500">Publish a new title and generate physical copy barcodes</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBook} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Book Title *</label>
                  <input
                    type="text"
                    required
                    value={newBook.title}
                    onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                    placeholder="e.g. Designing Data-Intensive Applications"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Author *</label>
                  <input
                    type="text"
                    required
                    value={newBook.author}
                    onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                    placeholder="e.g. Martin Kleppmann"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newBook.category_id}
                    onChange={(e) => setNewBook({ ...newBook, category_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Retail Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newBook.replacement_cost}
                    onChange={(e) => setNewBook({ ...newBook, replacement_cost: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Discount %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newBook.discount_percentage}
                    onChange={(e) => setNewBook({ ...newBook, discount_percentage: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Physical Copies</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newBook.initial_copies}
                    onChange={(e) => setNewBook({ ...newBook, initial_copies: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rack / Shelf Location</label>
                  <input
                    type="text"
                    value={newBook.rack_location}
                    onChange={(e) => setNewBook({ ...newBook, rack_location: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Summary</label>
                <textarea
                  rows={2}
                  value={newBook.description}
                  onChange={(e) => setNewBook({ ...newBook, description: e.target.value })}
                  placeholder="Summary of contents, edition highlights..."
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-600/25 disabled:opacity-50"
                >
                  {submitting ? 'Creating Book...' : 'Confirm & Generate Copies'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: EDIT BOOK PRICE & DISCOUNT (Admin Only)
         ========================================================================= */}
      {showEditModal && activeBook && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Edit Price & Discount</h2>
                <p className="text-xs text-slate-500">{activeBook.title}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateBook} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Retail Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editForm.replacement_cost}
                    onChange={(e) => setEditForm({ ...editForm, replacement_cost: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Discount % *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={editForm.discount_percentage}
                    onChange={(e) => setEditForm({ ...editForm, discount_percentage: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Price Calculation Preview Box */}
              <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block">Effective Customer Price:</span>
                  <span className="text-lg font-black text-sky-900 font-mono">
                    ₹
                    {(
                      parseFloat(editForm.replacement_cost || 0) *
                      (1 - parseFloat(editForm.discount_percentage || 0) / 100)
                    ).toFixed(2)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Customer Savings:</span>
                  <span className="font-bold text-emerald-600 font-mono">
                    -₹
                    {(
                      (parseFloat(editForm.replacement_cost || 0) *
                        parseFloat(editForm.discount_percentage || 0)) /
                      100
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/25 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Price & Discount'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: INVENTORY STOCK ADJUSTMENT (Admin / Librarian)
         ========================================================================= */}
      {showStockModal && activeBook && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Manage Warehouse Stock</h2>
                <p className="text-xs text-slate-500">{activeBook.title}</p>
              </div>
              <button onClick={() => setShowStockModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="mt-5 space-y-4">
              <div className="flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setStockAction('ADD')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                    stockAction === 'ADD' ? 'bg-white shadow text-emerald-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  + Add Stock Copies
                </button>
                <button
                  type="button"
                  onClick={() => setStockAction('REMOVE')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                    stockAction === 'REMOVE' ? 'bg-white shadow text-rose-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  - Withdraw Stock Copies
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Number of Copies</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={stockDelta}
                  onChange={(e) => setStockDelta(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Memo</label>
                <input
                  type="text"
                  required
                  value={stockNotes}
                  onChange={(e) => setStockNotes(e.target.value)}
                  placeholder="e.g. Received new shipment from publisher"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* Current copy list */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <p className="text-xs font-bold text-slate-700 mb-2">Registered Physical Barcodes ({bookDetails?.copies?.length || 0}):</p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto text-xs font-mono">
                  {bookDetails?.copies?.map((cp) => (
                    <div key={cp.id} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/60">
                      <span>{cp.barcode}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        cp.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {cp.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md disabled:opacity-50 ${
                    stockAction === 'ADD' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                  }`}
                >
                  {submitting ? 'Applying...' : stockAction === 'ADD' ? 'Add Copies' : 'Withdraw Copies'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: RENT BOOK (Customer / Staff)
         ========================================================================= */}
      {showRentModal && bookDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Rent Book Copy</h2>
                <p className="text-xs text-slate-500">{bookDetails.title}</p>
              </div>
              <button onClick={() => setShowRentModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRentBook} className="mt-5 space-y-4">
              <div className="bg-sky-50/70 p-4 rounded-2xl border border-sky-100 text-xs space-y-1.5 text-slate-600">
                <p>• Standard borrowing duration is <strong>14 Days</strong> from checkout.</p>
                <p>• Late returns incur <strong>₹5.00/day</strong> after grace period.</p>
                <p>• Rental records are tied securely to your membership card.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Available Barcode</label>
                <select
                  required
                  value={rentingCopyId}
                  onChange={(e) => setRentingCopyId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white font-mono"
                >
                  {bookDetails.copies
                    ?.filter((c) => c.status === 'AVAILABLE')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.barcode} ({c.rack_location}) - Condition: {c.condition}
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowRentModal(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-600/25 disabled:opacity-50"
                >
                  {submitting ? 'Confirming Rental...' : 'Confirm Book Rental'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 5: BUY BOOK (Customer / Staff)
         ========================================================================= */}
      {showBuyModal && bookDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Purchase Book Outright</h2>
                <p className="text-xs text-slate-500">{bookDetails.title}</p>
              </div>
              <button onClick={() => setShowBuyModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBuyBook} className="mt-5 space-y-4">
              {/* Order summary */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Retail Price:</span>
                  <span className="font-mono text-slate-700">₹{parseFloat(bookDetails.replacement_cost).toFixed(2)}</span>
                </div>
                {parseFloat(bookDetails.discount_percentage) > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount Applied ({bookDetails.discount_percentage}%):</span>
                    <span className="font-mono">
                      -₹{((parseFloat(bookDetails.replacement_cost) * parseFloat(bookDetails.discount_percentage)) / 100).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                  <span>Final Payable Amount:</span>
                  <span className="font-mono text-sky-700">
                    ₹
                    {(
                      parseFloat(bookDetails.replacement_cost) *
                      (1 - (parseFloat(bookDetails.discount_percentage) || 0) / 100)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Payment Gateway / Method</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {['UPI', 'CARD', 'CASH', 'BANK_TRANSFER'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`p-3 rounded-xl border text-center font-bold transition ${
                        paymentMethod === method
                          ? 'bg-sky-600 border-sky-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowBuyModal(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-md shadow-sky-600/25 disabled:opacity-50"
                >
                  {submitting ? 'Generating Invoice...' : 'Authorize Purchase & Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
