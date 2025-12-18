import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:shimmer/shimmer.dart';


class Product {
  final String id;
  final String name;
  final String basePrice;
  final String? imageUrl;
  final String slug;

  Product({
    required this.id,
    required this.name,
    required this.basePrice,
    this.imageUrl,
    required this.slug,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    // Handle backend response where id could be int or string
    final id = json['id'].toString();
    
    // Extract image URL - logic matches backend/frontend fallback
    String? imgUrl = json['image_url'];
    if (imgUrl == null || imgUrl.isEmpty) {
      imgUrl = json['thumbnail'];
    }

    // Convert relative URLs to absolute URLs
    if (imgUrl != null && imgUrl.isNotEmpty && !imgUrl.startsWith('http')) {
      // Remove leading slash if present
      if (imgUrl.startsWith('/')) {
        imgUrl = imgUrl.substring(1);
      }
      imgUrl = 'https://jsfashion.et/$imgUrl';
    }

    return Product(
      id: id,
      name: json['name'] ?? json['title'] ?? 'Unknown Product',
      basePrice: json['base_price']?.toString() ?? '0',
      imageUrl: imgUrl,
      slug: json['slug'] ?? '',
    );
  }
}

class ProductCard extends StatelessWidget {
  final Product product;
  final VoidCallback onTap;

  const ProductCard({
    super.key,
    required this.product,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final price = double.tryParse(product.basePrice) ?? 0.0;
    final formatter = NumberFormat("#,##0", "en_US");

    return GestureDetector(
      onTap: onTap,
      child: Container(
        color: Colors.white,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Container(
                    color: const Color(0xFFF5F5F5), // neutral-100
                    child: product.imageUrl != null && product.imageUrl!.isNotEmpty
                        ? CachedNetworkImage(
                            imageUrl: product.imageUrl!,
                            fit: BoxFit.cover,
                            placeholder: (context, url) => Shimmer.fromColors(
                              baseColor: Colors.grey[300]!,
                              highlightColor: Colors.grey[100]!,
                              child: Container(color: Colors.white),
                            ),
                            errorWidget: (context, url, error) => const Center(
                              child: Icon(Icons.broken_image, color: Colors.grey),
                            ),
                          )
                        : const Center(
                            child: Icon(Icons.shopping_bag_outlined, color: Colors.grey, size: 32),
                          ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 8.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: Colors.black,
                      height: 1.1,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${formatter.format(price)} Br',
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      fontWeight: FontWeight.w900,
                      color: Colors.black,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
