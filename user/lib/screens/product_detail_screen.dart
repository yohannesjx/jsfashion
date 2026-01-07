import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:provider/provider.dart';
import '../constants.dart';
import '../models/cart_model.dart';
import 'cart_screen.dart';

class ProductVariant {
  final String id;
  final String productId;
  final String name;
  final double price;
  final double? comparisonPrice;
  final int stock;

  final String? imageUrl;

  ProductVariant({
    required this.id,
    required this.productId,
    required this.name,
    required this.price,
    required this.stock,
    this.comparisonPrice,
    this.imageUrl,
  });

  factory ProductVariant.fromJson(Map<String, dynamic> json) {
    double originalPrice = double.tryParse(json['price']?.toString() ?? '0') ?? 0.0;
    double? salePrice = json['sale_price'] != null 
        ? double.tryParse(json['sale_price'].toString()) 
        : null;
    
    // Check if we have a valid sale price
    bool distinctSalePrice = salePrice != null && salePrice > 0 && salePrice < originalPrice;

    return ProductVariant(
      id: json['id'].toString(),
      productId: json['product_id'].toString(),
      name: json['name'] ?? 'Default',
      // If sale price exists, use it as the main price
      price: distinctSalePrice ? salePrice! : originalPrice,
      stock: int.tryParse(json['stock_quantity']?.toString() ?? '0') ?? 0,
      // If sale price exists, the original price becomes the comparison price
      comparisonPrice: distinctSalePrice ? originalPrice : (
        json['comparison_price'] != null 
          ? double.tryParse(json['comparison_price'].toString()) 
          : null
      ),
      imageUrl: json['image_url']?.toString(),
    );
  }
}

class ProductDetail {
  final String id;
  final String name;
  final String description;
  final String basePrice;
  final String slug;
  final String? imageUrl;
  final int stock;
  final List<String> images;
  final List<ProductVariant> variants;

  ProductDetail({
    required this.id,
    required this.name,
    required this.description,
    required this.basePrice,
    required this.slug,
    this.imageUrl,
    required this.stock,
    required this.images,
    required this.variants,
  });

  // Helper function to convert relative URLs to absolute URLs
  static String _makeAbsoluteUrl(String url) {
    if (url.isEmpty || url.startsWith('http')) {
      return url;
    }
    // Remove leading slash if present
    String cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    return 'https://jsfashion.et/$cleanUrl';
  }

  factory ProductDetail.fromJson(Map<String, dynamic> json) {
    final product = json['product'];
    final variants = (json['variants'] as List?)?.map((v) => ProductVariant.fromJson(v)).toList() ?? [];
    
    // Logic to handle images
    List<String> imgList = [];
    if (json['images'] != null) {
      imgList = List<String>.from(
        json['images'].map((img) {
          String url = img is String ? img : img['url'];
          return _makeAbsoluteUrl(url);
        })
      );
    }
    
    String? productImageUrl = product['image_url'];
    if (imgList.isEmpty && productImageUrl != null) {
      imgList.add(_makeAbsoluteUrl(productImageUrl));
    }

    int totalStock = variants.fold(0, (sum, item) => sum + item.stock);

    return ProductDetail(
      id: product['id'].toString(),
      name: product['name'] ?? product['title'],
      description: product['description'] ?? '',
      basePrice: product['base_price'].toString(),
      slug: product['slug'] ?? '',
      imageUrl: productImageUrl != null ? _makeAbsoluteUrl(productImageUrl) : null,
      stock: totalStock,
      images: imgList,
      variants: variants,
    );
  }
}

class ProductDetailScreen extends StatefulWidget {
  final String slug;
  final String? previewName;
  final String? previewImage;
  final String? previewPrice;
  final bool isInScrollView;

  const ProductDetailScreen({
    super.key,
    required this.slug,
    this.previewName,
    this.previewImage,
    this.previewPrice,
    this.isInScrollView = false,
  });

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> with TickerProviderStateMixin {
  ProductDetail? _product;
  bool _isLoading = true;
  String? _error;
  int _selectedVariantIndex = -1; // Default to no selection
  bool _showVariantError = false; // Validation state
  int _quantity = 1;
  int _currentImageIndex = 0;
  final PageController _pageController = PageController();
  
  // Animation Keys & Controller
  final GlobalKey _imageKey = GlobalKey();
  final GlobalKey _cartKey = GlobalKey();
  AnimationController? _animationController;
  AnimationController? _cartPulseController;

  @override
  void initState() {
    super.initState();
    // Fly animation
    _animationController = AnimationController(
        vsync: this, 
        duration: const Duration(milliseconds: 800)
    );
    // Cart impact animation
    _cartPulseController = AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 300),
        lowerBound: 1.0,
        upperBound: 1.4,
    );
    _fetchProductDetails();
  }

  @override
  void dispose() {
    _pageController.dispose();
    _animationController?.dispose();
    _cartPulseController?.dispose();
    super.dispose();
  }

  void _runAddToCartAnimation(VoidCallback onComplete) {
    RenderBox? imageBox = _imageKey.currentContext?.findRenderObject() as RenderBox?;
    RenderBox? cartBox = _cartKey.currentContext?.findRenderObject() as RenderBox?;

    if (imageBox == null || cartBox == null) {
      onComplete();
      return;
    }

    final startOffset = imageBox.localToGlobal(Offset.zero);
    final endOffset = cartBox.localToGlobal(Offset.zero);
    final Size startSize = imageBox.size;
    final Size endSize = const Size(24, 24); // Approximate cart icon size

    OverlayEntry? entry;
    
    // Lazy initialization if null (handles hot reload/restart edge case)
    if (_animationController == null) {
      _animationController = AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 800),
      );
    }
    // Lazy init for cart pulse
    if (_cartPulseController == null) {
       _cartPulseController = AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 300),
        lowerBound: 1.0,
        upperBound: 1.4,
      );
    }

    entry = OverlayEntry(builder: (context) {
      if (_animationController == null) return const SizedBox(); 

      return AnimatedBuilder(
        animation: _animationController!,
        builder: (context, child) {
          double t = _animationController!.value;
          
          Offset p0 = startOffset;
          Offset p2 = endOffset;
          
          // Control point for jump High
          Offset p1 = Offset(
            (p0.dx + p2.dx) / 2, 
            p0.dy - 50 // Gentler jump
          );
          
          // Bezier Calculation
          double x = (1 - t) * (1 - t) * p0.dx + 
                     2 * (1 - t) * t * p1.dx + 
                     t * t * p2.dx;
                     
          double y = (1 - t) * (1 - t) * p0.dy + 
                     2 * (1 - t) * t * p1.dy + 
                     t * t * p2.dy;

          // Scale: Shrink as it goes to cart
          double curWidth = startSize.width + (endSize.width - startSize.width) * t;
          double curHeight = startSize.height + (endSize.height - startSize.height) * t;
          
          return Positioned(
            left: x,
            top: y,
            width: curWidth,
            height: curHeight,
            child: Opacity(
              opacity: 1.0 - t > 0.1 ? 1.0 : 0.5, // Subtle fade at very end
              child: child!
            ),
          );
        },
        child: Material(
          elevation: 8,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          clipBehavior: Clip.antiAlias,
          child: _product != null && _product!.images.isNotEmpty
              ? CachedNetworkImage(imageUrl: _product!.images[_currentImageIndex], fit: BoxFit.cover)
              : const Icon(Icons.shopping_bag),
        ),
      );
    });

    Overlay.of(context).insert(entry);
    
    // Trigger impact slightly before end
    Future.delayed(const Duration(milliseconds: 600), () {
      _cartPulseController?.forward().then((_) => _cartPulseController?.reverse());
    });

    _animationController?.reset();
    _animationController?.forward().then((_) {
      entry?.remove();
      onComplete();
    });
    // Removed duplicate forward call that was in original logs
  }

  Future<void> _fetchProductDetails() async {
    try {
      final url = Uri.parse('${ApiConstants.baseUrl}/products/${widget.slug}');
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (mounted) {
          setState(() {
            _product = ProductDetail.fromJson(data);
            _isLoading = false;
            
            // Auto-select ONLY if there is exactly 1 variant
            if (_product!.variants.length == 1) {
               final firstInStock = _product!.variants.indexWhere((v) => v.stock > 0);
               if (firstInStock != -1) {
                 _selectedVariantIndex = firstInStock;
               }
            } else {
               _selectedVariantIndex = -1; // Force user selection
            }
          });
        }
      } else {
        throw Exception('Failed to load product details');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  String cleanVariantName(String variantName, String productName) {
    String cleaned = variantName.replaceAll(productName, '').trim();
    cleaned = cleaned.replaceAll(RegExp(r'^(tee|flat|cap|dress|bag|shoe|boot|sneaker|heel)\d*\s+', caseSensitive: false), '').trim();
    final parts = cleaned.split(RegExp(r'\s+'));
    final sizePattern = RegExp(r'^(\d+|[SMLX]{1,3}|[23]XL)$', caseSensitive: false);
    if (parts.isNotEmpty && sizePattern.hasMatch(parts.last)) {
      return parts.last.toUpperCase();
    }
    return cleaned.isEmpty ? variantName : cleaned;
  }

  void _addToCart() {
    if (_product == null) return;
    
    // Validation: Check if variant is selected
    if (_selectedVariantIndex == -1 && _product!.variants.length > 1) {
      setState(() {
        _showVariantError = true;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select a size/variant'),
          backgroundColor: Colors.red,
          duration: Duration(seconds: 2),
        ),
      );
      return;
    }

    final variants = _product!.variants;
    // Safety check
    if (_selectedVariantIndex == -1 && variants.length > 1) return;
    
    // If only 1 variant/default to 0 if something weird happens
    final actualIndex = _selectedVariantIndex == -1 ? 0 : _selectedVariantIndex;
    if (actualIndex >= variants.length) return; // double safety

    final currentVariant = variants[actualIndex];
    
    // Add to cart provider
    Provider.of<CartModel>(context, listen: false).addItem(CartItem(
      productId: _product!.id,
      productSlug: _product!.slug,
      productName: _product!.name,
      variantId: currentVariant.id,
      variantName: currentVariant.name,
      price: currentVariant.price,
      comparisonPrice: currentVariant.comparisonPrice, // Added comparison price
      maxStockInt: currentVariant.stock,
      imageUrl: currentVariant.imageUrl ?? _product!.imageUrl,
      quantity: _quantity,
    ));
  }

  @override
  Widget build(BuildContext context) {
    final formatter = NumberFormat("#,##0", "en_US");
    final size = MediaQuery.of(context).size;
    
    final displayName = _product?.name ?? widget.previewName ?? 'Loading...';
    
    final displayPrice = _product != null 
        ? ((_product!.variants.isNotEmpty && _selectedVariantIndex != -1) 
            ? _product!.variants[_selectedVariantIndex].price 
            : double.tryParse(_product!.basePrice) ?? 0)
        : (double.tryParse(widget.previewPrice ?? '0') ?? 0);
    final displayImage = _product != null && _product!.images.isNotEmpty
        ? _product!.images[_currentImageIndex]
        : widget.previewImage;
    
    final variants = _product?.variants ?? [];
    final currentVariant = (variants.isNotEmpty && _selectedVariantIndex != -1) ? variants[_selectedVariantIndex] : null;
    final maxStock = currentVariant?.stock ?? (variants.isNotEmpty ? 999 : 0); // Allow click if variants exist but none selected

    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // 1. Full Screen Images
          SizedBox(
            key: _imageKey,
            height: size.height,
            width: size.width,
            child: _product != null && _product!.images.isNotEmpty
                ? PageView.builder(
                    controller: _pageController,
                    itemCount: _product!.images.length,
                    onPageChanged: (index) {
                      setState(() {
                        _currentImageIndex = index;
                      });
                    },
                    itemBuilder: (context, index) {
                      return CachedNetworkImage(
                        imageUrl: _product!.images[index],
                        fit: BoxFit.cover, // Reverted to cover for full screen effect
                        alignment: Alignment.topCenter,
                        height: size.height,
                        placeholder: (context, url) =>
                            const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                        errorWidget: (context, url, error) => const SizedBox(),
                      );
                    },
                  )
                : (displayImage != null
                    ? CachedNetworkImage(
                        imageUrl: displayImage,
                        fit: BoxFit.contain,
                        height: size.height,
                      )
                    : Container(color: Colors.white)),
          ),

          // 2. Content Layer (Bottom Aligned)
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              // Gradient removed per user request
              child: SafeArea( // Ensure content respects bottom safe area
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Page Indicators (Dots)
                      if (_product != null && _product!.images.length > 1)
                        Align(
                          alignment: Alignment.center,
                          child: Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: _product!.images.asMap().entries.map((entry) {
                                return AnimatedContainer(
                                  duration: const Duration(milliseconds: 300),
                                  width: _currentImageIndex == entry.key ? 24 : 8,
                                  height: 8,
                                  margin: const EdgeInsets.symmetric(horizontal: 4),
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(4),
                                    color: _currentImageIndex == entry.key
                                        ? Colors.black
                                        : Colors.black.withValues(alpha: 0.2),
                                  ),
                                );
                              }).toList(),
                            ),
                          ),
                        ),

                      // Cart Icon (kept at bottom for animation target)
                      Align(
                        alignment: Alignment.centerRight,
                        child: Padding( // Add some padding to simulate row height or just keep it neat
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Consumer<CartModel>(
                            builder: (context, cart, child) => ScaleTransition(
                              scale: _cartPulseController ?? const AlwaysStoppedAnimation(1.0),
                              child: Stack(
                                key: _cartKey,
                                clipBehavior: Clip.none,
                                children: [
                                  Container(
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      shape: BoxShape.circle,
                                      boxShadow: [
                                        BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0,2))
                                      ],
                                    ),
                                    child: IconButton(
                                      icon: const Icon(Icons.shopping_bag_outlined, color: Colors.black, size: 22),
                                      onPressed: () {
                                        Navigator.push(context, MaterialPageRoute(builder: (context) => const CartScreen()));
                                      },
                                    ),
                                  ),
                                  if (cart.itemCount > 0)
                                    Positioned(
                                      right: 4,
                                      top: 4,
                                      child: Container(
                                        padding: const EdgeInsets.all(4),
                                        decoration: const BoxDecoration(
                                          color: Colors.red,
                                          shape: BoxShape.circle,
                                        ),
                                        constraints: const BoxConstraints(minWidth: 8, minHeight: 8),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                      
                      const SizedBox(height: 12), // Reduced from 24

                      // Size Variant Selector
                      // Show if more than 1 variant OR if 1 variant and it's not a generic "Default"/ "Default Title"
                      if (!_isLoading && variants.isNotEmpty && 
                          (variants.length > 1 || !variants[0].name.toLowerCase().contains('default'))) ...[
                        
                        // Error Message (Top of variants)
                        if (_showVariantError)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 8.0, left: 4.0),
                            child: Row(
                              children: [
                                Icon(Icons.info_outline, size: 14, color: Colors.red),
                                const SizedBox(width: 4),
                                Text(
                                  'Please select a size',
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.red,
                                  ),
                                ),
                              ],
                            ),
                          ),

                        // Error Boundary for Selector
                        Container(
                          padding: _showVariantError ? const EdgeInsets.all(8) : EdgeInsets.zero,
                          decoration: _showVariantError ? BoxDecoration(
                            border: Border.all(color: Colors.red, width: 2),
                            borderRadius: BorderRadius.circular(16),
                            color: Colors.red.withOpacity(0.05),
                          ) : null,
                          child: Wrap(
                            spacing: 12,
                            runSpacing: 12,
                            children: variants.asMap().entries
                              .where((entry) => entry.value.stock > 0)
                              .map((entry) {
                                final idx = entry.key;
                                final variant = entry.value;
                                final variantLabel = cleanVariantName(variant.name, displayName);
                                return variantLabel;
                              })
                              .where((label) => label.isNotEmpty)
                              .toSet() // Deduplicate labels
                              .map((label) {
                                final idx = variants.indexWhere((v) => 
                                  cleanVariantName(v.name, displayName) == label && v.stock > 0
                                );
                                final variant = variants[idx];
                                final isSelected = _selectedVariantIndex == idx;
                                final variantLabel = label;
                                final bool isLongText = variantLabel.length > 3;

                                return GestureDetector(
                                  onTap: () => setState(() {
                                    _selectedVariantIndex = idx;
                                    _showVariantError = false; // Clear error on selection
                                  }),
                                  child: Container(
                                    width: isLongText ? null : 44.0, 
                                    constraints: const BoxConstraints(minWidth: 44),
                                    padding: isLongText ? const EdgeInsets.symmetric(horizontal: 16) : EdgeInsets.zero,
                                    height: 44,
                                    decoration: BoxDecoration(
                                      color: isSelected ? Colors.black : Colors.white,
                                      borderRadius: BorderRadius.circular(12),
                                      border: isSelected ? null : Border.all(
                                        color: Colors.grey.withValues(alpha: 0.2),
                                        width: 1,
                                      ),
                                      boxShadow: [
                                         BoxShadow(
                                            color: Colors.black.withValues(alpha: 0.05),
                                            blurRadius: 4,
                                            offset: const Offset(0, 2)
                                         )
                                      ]
                                    ),
                                    child: Center(
                                      widthFactor: 1.0,
                                      child: Text(
                                        variantLabel,
                                        style: GoogleFonts.inter(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                          color: isSelected ? Colors.white : Colors.black,
                                        ),
                                      ),
                                    ),
                                  ),
                                );
                              }).toList(),
                          ),
                        ),
                        const SizedBox(height: 20), // Reduced from 32
                      ],

                      // Full Width Add to Cart Button with Price
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton(
                          onPressed: (_product == null || maxStock <= 0) 
                              ? null 
                              : () {
                                  // Validation BEFORE animation
                                  if (_selectedVariantIndex == -1 && variants.length > 1) {
                                      setState(() {
                                        _showVariantError = true;
                                      });
                                      // Optional: Vibrate or simple feedback
                                      return; 
                                  }

                                  _runAddToCartAnimation(() {
                                    _addToCart();
                                  });
                                },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.black,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(horizontal: 8), // Start content close to edge
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.start,
                            children: [
                                // Price Pill in Button
                                Container(
                                  padding: const EdgeInsets.fromLTRB(6, 8, 8, 8), // Left padding reduced to 6 (moved left by 2px)
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFFEBEE), // Light red background (same as above)
                                    borderRadius: BorderRadius.circular(100), // Fully rounded pill
                                  ),
                                  constraints: const BoxConstraints(
                                    minWidth: 80, // Ensure pill has width
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(6),
                                        decoration: const BoxDecoration(
                                          color: Colors.white,
                                          shape: BoxShape.circle,
                                        ),
                                        child: const Icon(Icons.shopping_bag_outlined, size: 14, color: Colors.black),
                                      ),
                                      const SizedBox(width: 8),
                                      if (currentVariant != null && currentVariant.comparisonPrice != null && currentVariant.comparisonPrice! > currentVariant.price) ...[
                                        Text(
                                          '${formatter.format(currentVariant.comparisonPrice)}',
                                          style: GoogleFonts.inter(
                                            fontSize: 12,
                                              decoration: TextDecoration.lineThrough,
                                              color: Colors.black.withOpacity(0.5),
                                          ),
                                        ),
                                        const SizedBox(width: 6),
                                        Text(
                                          '${formatter.format(currentVariant.price)} Br',
                                          style: GoogleFonts.inter(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w900,
                                            color: const Color(0xFFE53935), // Red
                                          ),
                                        ),
                                      ] else 
                                        Text(
                                          '${formatter.format(displayPrice)} Br',
                                          style: GoogleFonts.inter(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w900,
                                            color: const Color(0xFFE53935), // Red
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              const Spacer(),
                              Text(
                                maxStock > 0 ? 'Add to Cart' : 'Out of Stock',
                                style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(width: 4), // Move text to left by adding spacing on right
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),



          // 3. Custom Top Bar (Back & Cart) - Only show back button if not in scroll view
          if (!widget.isInScrollView)
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: Colors.white,
                        radius: 20,
                        child: BackButton(color: Colors.black),
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
}
