import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import '../constants.dart';
import '../widgets/product_card.dart';
import '../models/cart_model.dart';
import 'product_detail_screen.dart';
import 'cart_screen.dart';
import '../widgets/floating_contact_button.dart';
import 'package:shared_preferences/shared_preferences.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  List<Product> _allProducts = []; // All products from API
  List<Product> _displayedProducts = []; // Currently displayed products
  List<dynamic> _categories = [];
  bool _isLoading = true;
  bool _isLoadingMore = false;
  String? _error;
  String _heroBannerUrl = 'https://jsfashion.et/hero-bg.jpg'; // Default hero banner
  String _heroTitle = ''; // Will be loaded from API
  String _heroSubtitle = ''; // Default hero subtitle
  
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounce;
  bool _isSearchVisible = false;
  String? _selectedCategoryName;
  
  late AnimationController _marqueeController;
  
  final int _productsPerPage = 40;
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    print('🚀 [TIMING] initState started');
    final startTime = DateTime.now();
    
    _marqueeController = AnimationController(
      duration: const Duration(seconds: 25),
      vsync: this,
    )..repeat();
    print('🚀 [TIMING] Animation controller created: ${DateTime.now().difference(startTime).inMilliseconds}ms');
    
    // Load cached data first for instant display
    _loadCachedData().then((_) {
      print('🚀 [TIMING] Cache loaded: ${DateTime.now().difference(startTime).inMilliseconds}ms');
    });
    
    // Then fetch fresh data in background
    _fetchHeroBanner();
    _fetchCategories();
    _fetchProducts();
    print('🚀 [TIMING] initState completed: ${DateTime.now().difference(startTime).inMilliseconds}ms');
  }

  Future<void> _loadCachedData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      
      // Load cached products
      final cachedProductsJson = prefs.getString('cached_products');
      if (cachedProductsJson != null) {
        final List<dynamic> productsData = json.decode(cachedProductsJson);
        final products = productsData.map((p) => Product.fromJson(p)).toList();
        
        if (mounted && products.isNotEmpty) {
          setState(() {
            _allProducts = products;
            _displayedProducts = products.take(_productsPerPage).toList();
            _isLoading = false;
          });
          print('✅ Loaded ${products.length} products from cache');
        }
      }
      
      // Load cached categories
      final cachedCategoriesJson = prefs.getString('cached_categories');
      if (cachedCategoriesJson != null) {
        final List<dynamic> categoriesData = json.decode(cachedCategoriesJson);
        
        if (mounted && categoriesData.isNotEmpty) {
          setState(() {
            _categories = categoriesData;
          });
          print('✅ Loaded ${categoriesData.length} categories from cache');
        }
      }
    } catch (e) {
      print('⚠️ Error loading cache: $e');
    }
  }

  Future<void> _fetchHeroBanner() async {
    try {
      final url = Uri.parse('${ApiConstants.baseUrl}/settings');
      print('🎨 Fetching hero banner from: $url');
      final response = await http.get(url);
      
      print('📡 Hero Banner Response Status: ${response.statusCode}');
      print('📦 Hero Banner Response Body: ${response.body}');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('🔧 Decoded hero banner data: $data');
        
        // Check both possible response formats
        String? bannerUrl;
        String? title;
        String? subtitle;
        
        if (data['hero_banner_url'] != null) {
          if (data['hero_banner_url'] is String) {
            bannerUrl = data['hero_banner_url'];
          } else if (data['hero_banner_url']['String'] != null) {
            bannerUrl = data['hero_banner_url']['String'];
          }
        }
        
        if (data['hero_title'] != null) {
          if (data['hero_title'] is String) {
            title = data['hero_title'];
          } else if (data['hero_title']['String'] != null) {
            title = data['hero_title']['String'];
          }
        }
        
        if (data['hero_subtitle'] != null) {
          if (data['hero_subtitle'] is String) {
            subtitle = data['hero_subtitle'];
          } else if (data['hero_subtitle']['String'] != null) {
            subtitle = data['hero_subtitle']['String'];
          }
        }
        
        print('🖼️ Extracted banner URL: $bannerUrl');
        print('📝 Extracted title: $title');
        print('📝 Extracted subtitle: $subtitle');
        
        if (mounted) {
          setState(() {
            if (bannerUrl != null && bannerUrl.isNotEmpty) {
              _heroBannerUrl = bannerUrl;
            }
            if (title != null && title.isNotEmpty) {
              _heroTitle = title;
            }
            if (subtitle != null && subtitle.isNotEmpty) {
              _heroSubtitle = subtitle;
            }
          });
          print('✅ Hero settings updated');
        }
      }
    } catch (e) {
      print('❌ Error fetching hero banner: $e');
      // Keep default values on error
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    _debounce?.cancel();
    _marqueeController.dispose();
    super.dispose();
  }

  bool _isCategoriesLoading = true;
  String? _categoryError;

  Future<void> _fetchCategories() async {
    if (!mounted) return;
    setState(() {
      _isCategoriesLoading = true;
      _categoryError = null;
    });

    try {
      final url = Uri.parse('${ApiConstants.baseUrl}/categories');
      print('🔍 Fetching categories from: $url');
      final response = await http.get(url);
      print('📡 Categories Response Status: ${response.statusCode}');
      print('📦 Categories Response Body: ${response.body}');

      if (response.statusCode == 200) {
        final dynamic data = json.decode(response.body);
        print('🔧 Decoded data type: ${data.runtimeType}');
        
        List<dynamic> categoryList = [];
        if (data is List) {
           print('✅ Data is a List with ${data.length} items');
           categoryList = data;
        } else if (data is Map<String, dynamic>) {
           print('📋 Data is a Map with keys: ${data.keys}');
           if (data.containsKey('categories')) {
              categoryList = data['categories'];
              print('✅ Found categories key with ${categoryList.length} items');
           }
        }
        
        print('📊 Final categoryList length: ${categoryList.length}');
        if (categoryList.isNotEmpty) {
          print('📝 First category: ${categoryList[0]}');
          
          // Save to cache
          try {
            final prefs = await SharedPreferences.getInstance();
            await prefs.setString('cached_categories', json.encode(categoryList));
            print('💾 Categories saved to cache');
          } catch (e) {
            print('⚠️ Failed to cache categories: $e');
          }
        }
        
        if (mounted) {
           setState(() {
             _categories = categoryList;
             _isCategoriesLoading = false;
           });
        }
      } else {
        throw Exception('Status ${response.statusCode}');
      }
    } catch (e, stackTrace) {
      print('❌ Error fetching categories: $e');
      print('📚 Stack trace: $stackTrace');
      if (mounted) {
        setState(() {
          _isCategoriesLoading = false;
          _categoryError = 'Failed to load';
        });
      }
    }
  }

  Future<void> _fetchProducts({String searchQuery = '', String? categoryId}) async {
    print('🔍 [DEBUG] _fetchProducts called with searchQuery="$searchQuery", categoryId="$categoryId"');
    setState(() {
      _isLoading = true;
      _currentPage = 0;
    });

    try {
      // Build Query - fetch more products for randomization
      String query = '?limit=1000';
      if (searchQuery.isNotEmpty) query += '&search=$searchQuery';
      if (categoryId != null) query += '&category_id=$categoryId';

      final url = Uri.parse('${ApiConstants.baseUrl}/products$query');
      print('🌐 [DEBUG] Fetching from: $url');
      
      final response = await http.get(url);
      print('📡 [DEBUG] Response status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final dynamic data = json.decode(response.body);
        List<dynamic> productList;
        if (data is List) {
          productList = data;
        } else {
          productList = data['products'] ?? [];
        }

        print('📦 [DEBUG] Received ${productList.length} products');

        if (mounted) {
          // Shuffle products for randomization
          productList.shuffle();
          
          final products = productList.map((json) => Product.fromJson(json)).toList();
          
          setState(() {
            _allProducts = products;
            _displayedProducts = products.take(_productsPerPage).toList();
            _isLoading = false;
            _error = null;
          });
          
          // Save to cache (only if not searching/filtering)
          if (searchQuery.isEmpty && categoryId == null) {
            try {
              final prefs = await SharedPreferences.getInstance();
              final productsJson = products.map((p) => p.toJson()).toList();
              await prefs.setString('cached_products', json.encode(productsJson));
              print('💾 Saved ${products.length} products to cache');
            } catch (e) {
              print('⚠️ Failed to cache products: $e');
            }
          }
        }
      } else {
        throw Exception('Failed to load products: ${response.statusCode}');
      }
    } catch (e) {
      print('Error fetching products: $e');
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  void _loadMore() {
    if (_isLoadingMore) return;
    
    setState(() {
      _isLoadingMore = true;
    });

    // Simulate loading delay for UX
    Future.delayed(const Duration(milliseconds: 300), () {
      if (!mounted) return;
      
      final nextPage = _currentPage + 1;
      final startIndex = nextPage * _productsPerPage;
      final endIndex = (startIndex + _productsPerPage).clamp(0, _allProducts.length);
      
      if (startIndex < _allProducts.length) {
        setState(() {
          _displayedProducts.addAll(_allProducts.sublist(startIndex, endIndex));
          _currentPage = nextPage;
          _isLoadingMore = false;
        });
      } else {
        setState(() {
          _isLoadingMore = false;
        });
      }
    });
  }

  void _onSearchChanged(String query) {
    if (_debounce?.isActive ?? false) _debounce!.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      _fetchProducts(searchQuery: query);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: const FloatingContactButton(),
      backgroundColor: Colors.white,
      drawerEnableOpenDragGesture: false, // Disable swipe to open drawer
      drawer: Drawer(
        backgroundColor: Colors.white,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start, // Align header left?
          children: [
            // Custom Header with Close Button + Logo
            SafeArea(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                decoration: BoxDecoration(
                   border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
                ),
                child: Row(
                  children: [
                    Text(
                      'JsFashion',
                      style: GoogleFonts.inter(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -1.0,
                        color: Colors.black,
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.close, size: 28, color: Colors.black),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
            ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: _fetchCategories,
                color: Colors.black,
                child: ListView(
                  padding: const EdgeInsets.only(top: 4),
                  children: [
                    // Categories
                    if (_isCategoriesLoading)
                       Padding(
                         padding: const EdgeInsets.all(16.0),
                         child: Text(
                           'Loading categories...',
                           style: GoogleFonts.inter(color: Colors.grey, fontSize: 12),
                         ),
                       )
                    else if (_categoryError != null)
                       Padding(
                         padding: const EdgeInsets.all(16.0),
                         child: Row(
                           children: [
                             Text(
                               'Failed to load.',
                               style: GoogleFonts.inter(color: Colors.red, fontSize: 12),
                             ),
                             const SizedBox(width: 8),
                             InkWell(
                               onTap: _fetchCategories,
                               child: const Icon(Icons.refresh, size: 16),
                             )
                           ],
                         ),
                       )
                    else if (_categories.isEmpty)
                       Padding(
                         padding: const EdgeInsets.all(16.0),
                         child: Text(
                           'No categories found.',
                           style: GoogleFonts.inter(color: Colors.grey, fontSize: 12),
                         ),
                       )
                    else
                    ..._categories.map((cat) => InkWell(
                      onTap: () {
                        Navigator.pop(context);
                        setState(() {
                          _selectedCategoryName = cat['name'];
                          _searchController.clear();
                        });
                        _fetchProducts(categoryId: cat['id'].toString());
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        decoration: BoxDecoration(
                          color: _selectedCategoryName == cat['name'] 
                              ? Colors.black.withOpacity(0.03)
                              : Colors.transparent,
                          border: Border(
                            left: BorderSide(
                              color: _selectedCategoryName == cat['name']
                                  ? Colors.black
                                  : Colors.transparent,
                              width: 3,
                            ),
                          ),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                (cat['name'] as String? ?? '').toUpperCase(),
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: _selectedCategoryName == cat['name']
                                      ? FontWeight.w700
                                      : FontWeight.w500,
                                  letterSpacing: 0.8,
                                  color: _selectedCategoryName == cat['name'] 
                                      ? Colors.black 
                                      : Colors.grey[700],
                                ),
                              ),
                            ),
                            if (_selectedCategoryName == cat['name'])
                              const Icon(Icons.check, size: 16, color: Colors.black),
                          ],
                        ),
                      ),
                    )),

                    // GIFT CARD (Static)
                    Container(
                      decoration: BoxDecoration(
                        border: Border(bottom: BorderSide(color: Colors.grey.shade100)),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                        title: Text(
                          'GIFT CARD',
                          style: GoogleFonts.inter(
                            fontSize: 16,
                            fontWeight: FontWeight.bold, // Special item bold
                            letterSpacing: 0.5,
                            color: Colors.black,
                          ),
                        ),
                        onTap: () {
                          Navigator.pop(context);
                          // Navigate to gift card screen or show toast
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Gift Cards coming soon')),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      appBar: PreferredSize(
        preferredSize: Size.fromHeight(
          48 + // Toolbar height
          (_isSearchVisible ? 60 : 0) + 
          24 + // Banner height
          MediaQuery.of(context).padding.top // Add status bar height
        ),
        child: Container(
          color: Colors.black,
          child: SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Top Banner - Free Shipping
                Container(
                  width: double.infinity,
                  color: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Text(
                    'FREE DELIVERY ON ORDERS OVER 5000 Br',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                      color: Colors.white,
                    ),
                  ),
                ),
              // Main AppBar
              Container(
                height: 48 + (_isSearchVisible ? 60 : 0), // Fixed height
                child: AppBar(
                  toolbarHeight: 48,
                  title: GestureDetector(
                    onTap: () {
                      // Reset to home view
                      setState(() {
                        _selectedCategoryName = null;
                        _searchController.clear();
                        _isSearchVisible = false;
                      });
                      _fetchProducts();
                    },
                    child: Text(
                      'JsFashion',
                      style: GoogleFonts.inter(
                        fontWeight: FontWeight.w900,
                        color: Colors.black,
                        letterSpacing: -1.0,
                        fontSize: 30, // Increased from 26
                      ),
                    ),
                  ),
                  centerTitle: true,
                  backgroundColor: Colors.white,
                  elevation: 0,
                  iconTheme: const IconThemeData(color: Colors.black, size: 30), // Increased from 26
                  actions: [
                    IconButton(
                      icon: Icon(_isSearchVisible ? Icons.close : Icons.search, size: 30), // Increased from 26
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      onPressed: () {
                        setState(() {
                          _isSearchVisible = !_isSearchVisible;
                          if (!_isSearchVisible) {
                             _searchController.clear();
                             _fetchProducts();
                          }
                        });
                      },
                    ),
                    const SizedBox(width: 12),
                    // Cart Icon with Badge
                    Consumer<CartModel>(
                      builder: (context, cart, child) {
                        final itemCount = cart.itemCount;
                        return Stack(
                          clipBehavior: Clip.none,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.shopping_bag_outlined, size: 30), // Increased from 26
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                              onPressed: () {
                                Navigator.push(context, MaterialPageRoute(builder: (context) => const CartScreen()));
                              },
                            ),
                            if (itemCount > 0)
                              Positioned(
                                right: 0,
                                top: 0,
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: BoxDecoration(
                                    color: Colors.red,
                                    shape: BoxShape.circle,
                                  ),
                                  constraints: const BoxConstraints(
                                    minWidth: 18,
                                    minHeight: 18,
                                  ),
                                  child: Text(
                                    itemCount > 99 ? '99+' : itemCount.toString(),
                                    style: GoogleFonts.inter(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              ),
                          ],
                        );
                      },
                    ),
                    const SizedBox(width: 12),
                  ],
                  bottom: _isSearchVisible 
                      ? PreferredSize(
                          preferredSize: const Size.fromHeight(60),
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                            child: TextField(
                              controller: _searchController,
                              onChanged: _onSearchChanged,
                              autofocus: true,
                              decoration: InputDecoration(
                                hintText: 'Search products...',
                                prefixIcon: const Icon(Icons.search, color: Colors.grey),
                                filled: true,
                                fillColor: const Color(0xFFF5F5F5),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(0),
                                  borderSide: BorderSide.none,
                                ),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
                              ),
                              style: GoogleFonts.inter(color: Colors.black),
                              cursorColor: Colors.black,
                            ),
                          ),
                        )
                      : null,
                ),
              ),
            ],
          ),
        ),
      ),
      ),
      body: Column(
        children: [
          // Main Content
          Expanded(
            child: _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(_error!),
                      TextButton(
                        onPressed: () => _fetchProducts(searchQuery: _searchController.text),
                        child: const Text('Retry', style: TextStyle(color: Colors.black)),
                      ),
                    ],
                  ),
                )
              : _isLoading
                  ? const Center(child: CircularProgressIndicator(color: Colors.black))
                  : RefreshIndicator(
                      color: Colors.black,
                      onRefresh: () async {
                        // Refresh both hero banner and products
                        await Future.wait([
                          _fetchHeroBanner(),
                          _fetchProducts(
                            searchQuery: _searchController.text,
                            categoryId: _selectedCategoryName != null 
                                ? _categories.firstWhere(
                                    (cat) => cat['name'] == _selectedCategoryName,
                                    orElse: () => {'id': null}
                                  )['id']?.toString()
                                : null,
                          ),
                        ]);
                      },
                      child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Hero Banner - Only show on home page (no category, no search)
                            if (_selectedCategoryName == null && _searchController.text.isEmpty) ...[
                              // Hero Banner
                              Container(
                                height: MediaQuery.of(context).size.height * 0.6,
                                width: double.infinity,
                                child: Stack(
                                  children: [
                                    // Background Image
                                    CachedNetworkImage(
                                      imageUrl: _heroBannerUrl,
                                      cacheKey: _heroBannerUrl, // Force refresh when URL changes
                                      fit: BoxFit.cover,
                                      width: double.infinity,
                                      height: double.infinity,
                                      color: Colors.black.withOpacity(0.3),
                                      colorBlendMode: BlendMode.darken,
                                      placeholder: (context, url) => Container(
                                        decoration: BoxDecoration(
                                          gradient: LinearGradient(
                                            begin: Alignment.topLeft,
                                            end: Alignment.bottomRight,
                                            colors: [
                                              Colors.grey.shade300,
                                              Colors.grey.shade100,
                                            ],
                                          ),
                                        ),
                                      ),
                                      errorWidget: (context, url, error) => Container(
                                        decoration: BoxDecoration(
                                          gradient: LinearGradient(
                                            begin: Alignment.topLeft,
                                            end: Alignment.bottomRight,
                                            colors: [
                                              Colors.grey.shade300,
                                              Colors.grey.shade100,
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                    // Text Overlay
                                    Center(
                                      child: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Text(
                                            _heroTitle,
                                            textAlign: TextAlign.center,
                                            style: GoogleFonts.inter(
                                              fontSize: 64,
                                              fontWeight: FontWeight.w900,
                                              letterSpacing: -2.0,
                                              height: 0.9,
                                              color: Colors.white,
                                            ),
                                          ),
                                          if (_heroSubtitle.isNotEmpty) ...[
                                            const SizedBox(height: 16),
                                            Text(
                                              _heroSubtitle,
                                              textAlign: TextAlign.center,
                                              style: GoogleFonts.inter(
                                                fontSize: 20,
                                                fontWeight: FontWeight.w500,
                                                color: Colors.white,
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),

                              // Scrolling Marquee
                              Container(
                                width: double.infinity,
                                height: 40,
                                color: Colors.black,
                                child: ClipRect(
                                  child: OverflowBox(
                                    alignment: Alignment.centerLeft,
                                    maxWidth: double.infinity,
                                    child: AnimatedBuilder(
                                      animation: _marqueeController,
                                      builder: (context, child) {
                                        return Transform.translate(
                                          offset: Offset(
                                            -_marqueeController.value * 1500, // Scroll distance
                                            0,
                                          ),
                                          child: Row(
                                            children: [
                                              _buildMarqueeText('FREE DELIVERY IN ADDIS ON ORDERS OVER 5000BR'),
                                              _buildMarqueeDot(),
                                              _buildMarqueeText('NEW COLLECTION DROPPING EVERYDAY'),
                                              _buildMarqueeDot(),
                                              _buildMarqueeText('LIMITED EDITION PIECES'),
                                              _buildMarqueeDot(),
                                              _buildMarqueeText('FREE DELIVERY IN ADDIS ON ORDERS OVER 5000BR'),
                                              _buildMarqueeDot(),
                                              _buildMarqueeText('NEW COLLECTION DROPPING EVERYDAY'),
                                              _buildMarqueeDot(),
                                              _buildMarqueeText('LIMITED EDITION PIECES'),
                                              _buildMarqueeDot(),
                                              // Duplicate for seamless loop
                                              _buildMarqueeText('FREE DELIVERY IN ADDIS ON ORDERS OVER 5000BR'),
                                              _buildMarqueeDot(),
                                              _buildMarqueeText('NEW COLLECTION DROPPING EVERYDAY'),
                                              _buildMarqueeDot(),
                                              _buildMarqueeText('LIMITED EDITION PIECES'),
                                              _buildMarqueeDot(),
                                            ],
                                          ),
                                        );
                                      },
                                    ),
                                  ),
                                ),
                              ),
                            ],

                            // NEW ARRIVALS / Category Title
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 32, 16, 16),
                              child: Row(
                                children: [
                                  Text(
                                    _selectedCategoryName != null 
                                        ? _selectedCategoryName!.toUpperCase()
                                        : 'NEW ARRIVALS',
                                    style: GoogleFonts.inter(
                                      fontSize: 32,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: -1.0,
                                    ),
                                  ),
                                  if (_selectedCategoryName != null) ...[
                                    const SizedBox(width: 12),
                                    GestureDetector(
                                      onTap: () {
                                        setState(() {
                                          _selectedCategoryName = null;
                                          _searchController.clear();
                                        });
                                        _fetchProducts();
                                      },
                                      child: Icon(
                                        Icons.close,
                                        size: 28,
                                        color: Colors.black,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),

                            // Products Grid
                            _displayedProducts.isEmpty
                                ? Center(
                                    child: Padding(
                                      padding: const EdgeInsets.all(32.0),
                                      child: Column(
                                        children: [
                                          const Icon(Icons.search_off, size: 64, color: Colors.grey),
                                          const SizedBox(height: 16),
                                          Text(
                                            'No products found',
                                            style: GoogleFonts.inter(
                                              fontSize: 16,
                                              color: Colors.grey[600],
                                            ),
                                          ),
                                          TextButton(
                                            onPressed: () => _fetchProducts(),
                                            child: const Text('Refresh', style: TextStyle(color: Colors.black)),
                                          ),
                                        ],
                                      ),
                                    ),
                                  )
                                : GridView.builder(
                                    shrinkWrap: true,
                                    physics: const NeverScrollableScrollPhysics(),
                                    padding: const EdgeInsets.all(0),
                                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                      crossAxisCount: 2,
                                      childAspectRatio: 3 / 4.7,
                                      crossAxisSpacing: 1,
                                      mainAxisSpacing: 1,
                                    ),
                                    itemCount: _displayedProducts.length,
                                    itemBuilder: (context, index) {
                                      return ProductCard(
                                        product: _displayedProducts[index],
                                        onTap: () {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (context) => ProductDetailScreen(
                                                slug: _displayedProducts[index].slug.isNotEmpty 
                                                    ? _displayedProducts[index].slug 
                                                    : _displayedProducts[index].id,
                                                previewName: _displayedProducts[index].name,
                                                previewPrice: _displayedProducts[index].salePrice ?? _displayedProducts[index].basePrice,
                                                previewImage: _displayedProducts[index].imageUrl,
                                              ),
                                            ),
                                          );
                                        },
                                      );
                                    },
                                  ),

                            // Load More Button
                            if (_displayedProducts.length < _allProducts.length)
                              Padding(
                                padding: const EdgeInsets.all(24.0),
                                child: SizedBox(
                                  width: double.infinity,
                                  height: 56,
                                  child: ElevatedButton(
                                    onPressed: _isLoadingMore ? null : _loadMore,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.white,
                                      foregroundColor: Colors.black,
                                      elevation: 0,
                                      shape: const RoundedRectangleBorder(
                                        borderRadius: BorderRadius.zero,
                                        side: BorderSide(color: Colors.black, width: 1),
                                      ),
                                    ),
                                    child: _isLoadingMore
                                        ? const SizedBox(
                                            height: 20,
                                            width: 20,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                              color: Colors.black,
                                            ),
                                          )
                                        : Text(
                                            'LOAD MORE',
                                            style: GoogleFonts.inter(
                                              fontSize: 16,
                                              fontWeight: FontWeight.w600,
                                              letterSpacing: 2.0,
                                            ),
                                          ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
          ),
        ],
      ),

    );
  }

  Widget _buildMarqueeText(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Text(
        text,
        style: GoogleFonts.robotoMono(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          letterSpacing: 2.0,
          color: Colors.white,
        ),
      ),
    );
  }

  Widget _buildMarqueeDot() {
    return const Padding(
      padding: EdgeInsets.symmetric(horizontal: 8),
      child: Text(
        '•',
        style: TextStyle(color: Colors.white, fontSize: 14),
      ),
    );
  }
}
