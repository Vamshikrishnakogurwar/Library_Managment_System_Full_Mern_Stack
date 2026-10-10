import { getDbPool, testConnection } from '../config/database.js';

const booksData = [
  {
    book_code: 'BK-CS101-DS',
    isbn: '978-0131103627',
    title: 'Data Structures and Algorithms in Java',
    author: 'Robert Lafore',
    publisher: 'Pearson Education',
    edition: '2nd Edition',
    language: 'English',
    category_id: 1, // Computer Science & IT
    publication_year: 2021,
    replacement_cost: 650.00,
    discount_percentage: 15.00,
    description: 'Fundamental guide to data structures, algorithm analysis, linked lists, trees, graphs, and Big-O computational complexity for IT students.',
    cover_image_url: 'https://images.unsplash.com/photo-1532012164546-f432f2e37946?auto=format&fit=crop&q=80&w=400',
    copies: 5,
  },
  {
    book_code: 'BK-CS102-OS',
    isbn: '978-1118063330',
    title: 'Operating System Concepts',
    author: 'Abraham Silberschatz, Peter B. Galvin',
    publisher: 'Wiley Higher Education',
    edition: '10th Edition',
    language: 'English',
    category_id: 1,
    publication_year: 2020,
    replacement_cost: 820.00,
    discount_percentage: 20.00,
    description: 'The definitive "dinosaur book" covering process management, virtual memory, concurrency, multi-threading, CPU scheduling, and file systems.',
    cover_image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=400',
    copies: 4,
  },
  {
    book_code: 'BK-CS103-DBMS',
    isbn: '978-0078022159',
    title: 'Database System Concepts & Relational Architecture',
    author: 'Abraham Silberschatz, Henry F. Korth, S. Sudarshan',
    publisher: 'McGraw-Hill Education',
    edition: '7th Edition',
    language: 'English',
    category_id: 1,
    publication_year: 2022,
    replacement_cost: 750.00,
    discount_percentage: 12.00,
    description: 'In-depth study of relational databases, SQL queries, normalization, ACID transaction processing, indexing, and distributed storage systems.',
    cover_image_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=400',
    copies: 6,
  },
  {
    book_code: 'BK-CS104-NET',
    isbn: '978-0133594140',
    title: 'Computer Networks: A Systems Approach',
    author: 'Larry L. Peterson & Bruce S. Davie',
    publisher: 'Morgan Kaufmann / Elsevier',
    edition: '6th Edition',
    language: 'English',
    category_id: 1,
    publication_year: 2021,
    replacement_cost: 690.00,
    discount_percentage: 10.00,
    description: 'Master the OSI model, TCP/IP protocol suite, subnetting, congestion control, socket programming, and secure packet transport.',
    cover_image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=400',
    copies: 4,
  },
  {
    book_code: 'BK-AI201-DL',
    isbn: '978-0262035613',
    title: 'Deep Learning with Python & PyTorch',
    author: 'Ian Goodfellow, Yoshua Bengio, Aaron Courville',
    publisher: 'MIT Press',
    edition: '1st Edition',
    language: 'English',
    category_id: 2, // Artificial Intelligence
    publication_year: 2023,
    replacement_cost: 1100.00,
    discount_percentage: 25.00,
    description: 'Comprehensive mathematical grounding and hands-on neural network design, CNNs, RNNs, transformers, and generative modeling.',
    cover_image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=400',
    copies: 4,
  },
  {
    book_code: 'BK-AI202-ML',
    isbn: '978-1492032649',
    title: 'Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow',
    author: 'Aurélien Géron',
    publisher: "O'Reilly Media",
    edition: '3rd Edition',
    language: 'English',
    category_id: 2,
    publication_year: 2023,
    replacement_cost: 950.00,
    discount_percentage: 18.00,
    description: 'Practical guide to building intelligent end-to-end machine learning pipelines, feature engineering, classification, and deep neural nets.',
    cover_image_url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=400',
    copies: 5,
  },
  {
    book_code: 'BK-AI203-NLP',
    isbn: '978-1492053743',
    title: 'Natural Language Processing with Transformers',
    author: 'Lewis Tunstall, Leandro von Werra, Thomas Wolf',
    publisher: "O'Reilly Media",
    edition: '1st Edition',
    language: 'English',
    category_id: 2,
    publication_year: 2022,
    replacement_cost: 880.00,
    discount_percentage: 15.00,
    description: 'Building modern language applications using Hugging Face Transformers, fine-tuning BERT, GPT, question-answering, and summarization.',
    cover_image_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=400',
    copies: 3,
  },
  {
    book_code: 'BK-MATH301-LA',
    isbn: '978-0980232776',
    title: 'Introduction to Linear Algebra & Vector Calculus',
    author: 'Gilbert Strang',
    publisher: 'Wellesley-Cambridge Press',
    edition: '5th Edition',
    language: 'English',
    category_id: 3, // Mathematics & Discrete Logic
    publication_year: 2021,
    replacement_cost: 720.00,
    discount_percentage: 10.00,
    description: 'Essential linear algebra for machine learning, data engineering, eigenvalues, singular value decomposition (SVD), and matrix computations.',
    cover_image_url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=400',
    copies: 4,
  },
  {
    book_code: 'BK-MATH302-DM',
    isbn: '978-0073383095',
    title: 'Discrete Mathematics and Its Applications',
    author: 'Kenneth H. Rosen',
    publisher: 'McGraw-Hill Education',
    edition: '8th Edition',
    language: 'English',
    category_id: 3,
    publication_year: 2020,
    replacement_cost: 780.00,
    discount_percentage: 14.00,
    description: 'Core curriculum textbook for IT and CS covering propositional logic, set theory, graph theory, combinatorics, and proof strategies.',
    cover_image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=400',
    copies: 5,
  },
  {
    book_code: 'BK-IOT401-EMB',
    isbn: '978-0134610689',
    title: 'Embedded Systems and Internet of Things Architecture',
    author: 'Raj Kamal',
    publisher: 'McGraw-Hill Higher Education',
    edition: '4th Edition',
    language: 'English',
    category_id: 4, // Electronics & IoT
    publication_year: 2022,
    replacement_cost: 620.00,
    discount_percentage: 10.00,
    description: 'Hardware design, Arduino/ESP32 programming, sensor interfacing, MQTT communication protocols, and cloud IoT dashboard integration.',
    cover_image_url: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&q=80&w=400',
    copies: 3,
  },
  {
    book_code: 'BK-LIT501-1984',
    isbn: '978-0451524935',
    title: '1984 — Classic Dystopian Literature',
    author: 'George Orwell',
    publisher: 'Signet Classic / Penguin',
    edition: 'Centennial Edition',
    language: 'English',
    category_id: 1,
    publication_year: 2019,
    replacement_cost: 350.00,
    discount_percentage: 20.00,
    description: 'Iconic philosophical novel examining surveillance state mechanics, truth, autonomy, and socio-political systems.',
    cover_image_url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=400',
    copies: 4,
  },
  {
    book_code: 'BK-LIT502-ATOMIC',
    isbn: '978-0735211292',
    title: 'Atomic Habits: An Easy & Proven Way to Build Good Habits',
    author: 'James Clear',
    publisher: 'Avery / Penguin Random House',
    edition: 'Hardcover Edition',
    language: 'English',
    category_id: 1,
    publication_year: 2022,
    replacement_cost: 499.00,
    discount_percentage: 25.00,
    description: 'No-nonsense framework for making tiny behavioral changes that yield extraordinary personal and professional results over time.',
    cover_image_url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400',
    copies: 5,
  }
];

export async function seedBooksAndCustomers() {
  await testConnection();
  const pool = getDbPool();

  console.log('Seeding rich books catalog...');

  for (const b of booksData) {
    const [existing] = await pool.query('SELECT id FROM books WHERE isbn = ? OR book_code = ?', [b.isbn, b.book_code]);
    let bookId;
    if (existing && existing.length > 0) {
      bookId = existing[0].id;
      // Update price and discount
      await pool.query(
        'UPDATE books SET replacement_cost = ?, discount_percentage = ?, description = ? WHERE id = ?',
        [b.replacement_cost, b.discount_percentage, b.description, bookId]
      );
      console.log(`Updated existing book: ${b.title}`);
    } else {
      const [res] = await pool.query(
        `INSERT INTO books (book_code, isbn, title, author, publisher, edition, language, category_id, publication_year, replacement_cost, discount_percentage, description, cover_image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          b.book_code,
          b.isbn,
          b.title,
          b.author,
          b.publisher,
          b.edition,
          b.language,
          b.category_id,
          b.publication_year,
          b.replacement_cost,
          b.discount_percentage,
          b.description,
          b.cover_image_url,
        ]
      );
      bookId = res.insertId;
      console.log(`Created book: ${b.title} (ID ${bookId})`);
    }

    // Ensure copies exist
    const [copies] = await pool.query('SELECT COUNT(*) as count FROM book_copies WHERE book_id = ?', [bookId]);
    const currentCount = copies[0]?.count || 0;
    const todayStr = new Date().toISOString().split('T')[0];
    if (currentCount < b.copies) {
      const toAdd = b.copies - currentCount;
      for (let i = 1; i <= toAdd; i++) {
        const copyNum = currentCount + i;
        const barcode = `BAR-${bookId.toString().padStart(4, '0')}-${copyNum.toString().padStart(3, '0')}`;
        await pool.query(
          `INSERT INTO book_copies (book_id, copy_number, barcode, acquisition_date, acquisition_cost, status, \`condition\`, rack_location)
           VALUES (?, ?, ?, ?, ?, 'AVAILABLE', 'NEW', 'Section A - Stacks')`,
          [bookId, copyNum, barcode, todayStr, b.replacement_cost]
        );
      }
      console.log(`Added ${toAdd} copies for ${b.title}`);
    }
  }

  // Ensure Admin User has a customer profile so Admin can also test rent/buy directly
  const [adminUser] = await pool.query("SELECT id FROM users WHERE username = 'admin' LIMIT 1");
  if (adminUser && adminUser.length > 0) {
    const adminId = adminUser[0].id;
    const [existingCust] = await pool.query('SELECT id FROM customers WHERE user_id = ?', [adminId]);
    if (!existingCust || existingCust.length === 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      await pool.query(
        `INSERT INTO customers (user_id, customer_code, membership_type_id, address, id_proof_number, membership_start_date, membership_expiry_date, is_suspended, notes)
         VALUES (?, 'CUST-ADMIN-00001', 1, 'Library Operations HQ, Tech Campus', 'GOVT-ADMIN-01', ?, '2030-01-01', 0, 'System Administrator Profile')`,
        [adminId, todayStr]
      );
      console.log('Ensured admin customer profile exists.');
    }
  }

  console.log('All books and customer profiles seeded successfully!');
}

// Allow CLI direct run
if (process.argv[1]?.endsWith('seedMoreBooks.js')) {
  seedBooksAndCustomers()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}
