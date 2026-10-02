import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Filter, BookOpen, Layers, CheckCircle2, AlertCircle, X } from 'lucide-react';

export function CatalogPage() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal for new book creation
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    isbn: '',
    category_id: '',
    edition: '1st Edition',
    publisher: '',
    publication_year: new Date().getFullYear(),
    replacement_cost: 500,
    initial_copies: 2,
    rack_location: 'General Stacks',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ error: '', success: '' });

  const isStaff = user && (user.role === 'ADMIN' || user.role === 'LIBRARIAN');

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

  const handleCreateBook = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback({ error: '', success: '' });

    try {
      const payload = {
        ...newBook,
        category_id: newBook.category_id ? parseInt(newBook.category_id, 10) : null,
        publication_year: newBook.publication_year ? parseInt(newBook.publication_year, 10) : null,
        replacement_cost: parseFloat(newBook.replacement_cost) || 500,
        initial_copies: parseInt(newBook.initial_copies, 10) || 1,
      };

      const res = await api.createBook(payload);
      if (res.success) {
        setFeedback({ success: `Book '${newBook.title}' added successfully!`, error: '' });
        setShowAddModal(false);
        setNewBook({
          title: '',
          author: '',
          isbn: '',
          category_id: '',
          edition: '1st Edition',
          publisher: '',
          publication_year: new Date().getFullYear(),
          replacement_cost: 500,
          initial_copies: 2,
          rack_location: 'General Stacks',
          description: '',
        });
        fetchCatalog();
      }
    } catch (err) {
      setFeedback({ error: err.message || 'Failed to save book', success: '' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Book Catalog & Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse library collection, check availability, and manage copies
          </p>
        </div>
        {isStaff && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Title</span>
          </button>
        )}
      </div>

      {feedback.success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>{feedback.success}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by title, author, ISBN, or book code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div className="w-full md:w-64">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Books Table / Grid */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
          </div>
        ) : books.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">Title & Author</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Category</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">ISBN</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Available / Total</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Replacement Cost</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {books.map((book) => {
                  const avail = parseInt(book.available_copies || 0, 10);
                  const totalCopies = parseInt(book.total_copies || 0, 10);
                  return (
                    <tr key={book.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900">{book.title}</p>
                        <p className="text-xs text-slate-500">{book.author} {book.edition && `• ${book.edition}`}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {book.category_name || 'General'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                        {book.isbn || book.book_code}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="font-semibold text-emerald-600">{avail}</span>
                        <span className="text-slate-400"> / </span>
                        <span className="text-slate-700">{totalCopies}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-slate-800">
                        ₹{parseFloat(book.replacement_cost).toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {avail > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            In Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                            All Borrowed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-500">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300 stroke-1" />
            <p className="text-base font-semibold text-slate-700">No books found matching criteria</p>
            <p className="text-sm mt-1">Try adjusting your search terms or add a new book to the catalog.</p>
          </div>
        )}
      </div>

      {/* Add Book Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Add Book Title & Copies</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBook} className="mt-4 space-y-4">
              {feedback.error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{feedback.error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700">Book Title *</label>
                <input
                  type="text"
                  required
                  value={newBook.title}
                  onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="e.g. Clean Architecture"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Author *</label>
                  <input
                    type="text"
                    required
                    value={newBook.author}
                    onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="Robert C. Martin"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">ISBN</label>
                  <input
                    type="text"
                    value={newBook.isbn}
                    onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="978-0134494166"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Category</label>
                  <select
                    value={newBook.category_id}
                    onChange={(e) => setNewBook({ ...newBook, category_id: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
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
                  <label className="block text-xs font-semibold text-slate-700">Edition</label>
                  <input
                    type="text"
                    value={newBook.edition}
                    onChange={(e) => setNewBook({ ...newBook, edition: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Initial Copies</label>
                  <input
                    type="number"
                    min="1"
                    value={newBook.initial_copies}
                    onChange={(e) => setNewBook({ ...newBook, initial_copies: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Replacement Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newBook.replacement_cost}
                    onChange={(e) => setNewBook({ ...newBook, replacement_cost: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Shelf / Rack</label>
                  <input
                    type="text"
                    value={newBook.rack_location}
                    onChange={(e) => setNewBook({ ...newBook, rack_location: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : 'Create Title & Copies'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
