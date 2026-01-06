class FulfillmentOrder {
  final int id;
  final String orderId;
  final String trackingNumber;
  final String status;
  final int orderNumber;
  final String customerName;
  final int itemCount;
  final String totalAmount;
  final DateTime createdAt;

  FulfillmentOrder({
    required this.id,
    required this.orderId,
    required this.trackingNumber,
    required this.status,
    required this.orderNumber,
    required this.customerName,
    required this.itemCount,
    required this.totalAmount,
    required this.createdAt,
  });

  factory FulfillmentOrder.fromJson(Map<String, dynamic> json) {
    try {
      return FulfillmentOrder(
        id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
        orderId: json['order_id']?.toString() ?? '',
        trackingNumber: json['tracking_number']?.toString() ?? '',
        status: json['status']?.toString() ?? '',
        orderNumber: json['order_number'] is int ? json['order_number'] : int.tryParse(json['order_number'].toString()) ?? 0,
        customerName: json['customer_name']?.toString() ?? 'Unknown',
        itemCount: json['item_count'] is int ? json['item_count'] : int.tryParse(json['item_count']?.toString() ?? '0') ?? 0,
        totalAmount: json['total_amount']?.toString() ?? '0.00',
        createdAt: json['created_at'] != null ? DateTime.parse(json['created_at'].toString()) : DateTime.now(),
      );
    } catch (e, stack) {
      print("Error parsing FulfillmentOrder: $e");
      print("JSON: $json");
      print(stack);
      rethrow;
    }
  }
}

class FulfillmentItem {
  final String id;
  final String sku;
  final String productName;
  final String variantName;
  final String imageUrl;
  final int quantity;
  final int pickedQuantity;
  final int packedQuantity;

  FulfillmentItem({
    required this.id,
    required this.sku,
    required this.productName,
    required this.variantName,
    required this.imageUrl,
    required this.quantity,
    required this.pickedQuantity,
    required this.packedQuantity,
  });

  factory FulfillmentItem.fromJson(Map<String, dynamic> json) {
    return FulfillmentItem(
      id: json['id'],
      sku: json['sku'],
      productName: json['product_name'],
      variantName: json['variant_name'],
      imageUrl: json['image_url'] ?? '',
      quantity: json['quantity'],
      pickedQuantity: json['picked_quantity'] ?? 0,
      packedQuantity: json['packed_quantity'] ?? 0,
    );
  }
}

class ScanResult {
  final bool success;
  final String message;
  final ScannedItem? item;
  final OrderProgress? progress;

  ScanResult({
    required this.success,
    required this.message,
    this.item,
    this.progress,
  });

  factory ScanResult.fromJson(Map<String, dynamic> json) {
    return ScanResult(
      success: json['success'],
      message: json['message'],
      item: json['item'] != null ? ScannedItem.fromJson(json['item']) : null,
      progress: json['order_progress'] != null 
          ? OrderProgress.fromJson(json['order_progress']) 
          : null,
    );
  }
}

class ScannedItem {
  final String sku;
  final String productName;
  final int quantityScanned;
  final int quantityRequired;

  ScannedItem({
    required this.sku,
    required this.productName,
    required this.quantityScanned,
    required this.quantityRequired,
  });

  factory ScannedItem.fromJson(Map<String, dynamic> json) {
    return ScannedItem(
      sku: json['sku'],
      productName: json['product_name'],
      quantityScanned: json['quantity_scanned'],
      quantityRequired: json['quantity_required'],
    );
  }
}

class OrderProgress {
  final int totalItems;
  final int scannedItems;
  final bool isComplete;

  OrderProgress({
    required this.totalItems,
    required this.scannedItems,
    required this.isComplete,
  });

  factory OrderProgress.fromJson(Map<String, dynamic> json) {
    return OrderProgress(
      totalItems: json['total_items'],
      scannedItems: json['scanned_items'],
      isComplete: json['is_complete'],
    );
  }
}

class FulfillmentOrderDetails {
  final int id;
  final String orderId;
  final String trackingNumber;
  final int orderNumber;
  final List<DetailsItem> items;
  final ProgressTotals totals;

  FulfillmentOrderDetails({
    required this.id,
    required this.orderId,
    required this.trackingNumber,
    required this.orderNumber,
    required this.items,
    required this.totals,
  });

  factory FulfillmentOrderDetails.fromJson(Map<String, dynamic> json) {
    return FulfillmentOrderDetails(
      id: json['fulfillment_order_id'] ?? 0,
      orderId: (json['fulfillment_order_id'] ?? 0).toString(),
      trackingNumber: json['tracking_number'] ?? '',
      orderNumber: json['order_number'] ?? 0,
      items: (json['items'] as List?)?.map((i) => DetailsItem.fromJson(i)).toList() ?? [],
      totals: ProgressTotals.fromJson(json['totals'] ?? {}),
    );
  }
}

class DetailsItem {
  final String sku;
  final String productName;
  final String variantName;
  final int quantity;
  final bool picked;
  final bool packed;

  DetailsItem({
    required this.sku,
    required this.productName,
    required this.variantName,
    required this.quantity,
    required this.picked,
    required this.packed,
  });

  factory DetailsItem.fromJson(Map<String, dynamic> json) {
    return DetailsItem(
      sku: json['sku'],
      productName: json['product_name'],
      variantName: json['variant_name'],
      quantity: json['quantity'],
      picked: json['picked'] ?? false,
      packed: json['packed'] ?? false,
    );
  }
}

class ProgressTotals {
  final int totalItems;
  final int pickedItems;
  final int packedItems;

  ProgressTotals({
    required this.totalItems,
    required this.pickedItems,
    required this.packedItems,
  });

  factory ProgressTotals.fromJson(Map<String, dynamic> json) {
    return ProgressTotals(
      totalItems: json['total_items'] ?? 0,
      pickedItems: json['picked_items'] ?? 0,
      packedItems: json['packed_items'] ?? 0,
    );
  }
}
