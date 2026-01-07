class Popup {
  final String id;
  final String title;
  final String imageUrl;
  final String actionType; // 'link', 'product', 'category', 'none'
  final String actionTarget;
  final String frequency; // 'once_per_session', 'once_per_day', 'always'

  Popup({
    required this.id,
    required this.title,
    required this.imageUrl,
    required this.actionType,
    required this.actionTarget,
    required this.frequency,
  });

  factory Popup.fromJson(Map<String, dynamic> json) {
    return Popup(
      id: json['id'],
      title: json['title'],
      imageUrl: json['image_url'],
      actionType: json['action_type'],
      actionTarget: json['action_target'] ?? '',
      frequency: json['frequency'] ?? 'once_per_session',
    );
  }
}
