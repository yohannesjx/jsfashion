import 'package:flutter/foundation.dart';

/// Centralized logging utility for the application.
/// Automatically disabled in release builds for better performance.
class AppLogger {
  static const String _prefix = '[JsFashion]';

  /// Log debug information (disabled in release mode)
  static void debug(String message, [String? tag]) {
    if (kDebugMode) {
      final tagStr = tag != null ? '[$tag]' : '';
      debugPrint('$_prefix$tagStr DEBUG: $message');
    }
  }

  /// Log informational messages (disabled in release mode)
  static void info(String message, [String? tag]) {
    if (kDebugMode) {
      final tagStr = tag != null ? '[$tag]' : '';
      debugPrint('$_prefix$tagStr INFO: $message');
    }
  }

  /// Log warnings (shown in all modes)
  static void warning(String message, [Object? error, String? tag]) {
    final tagStr = tag != null ? '[$tag]' : '';
    debugPrint('$_prefix$tagStr WARNING: $message');
    if (error != null) {
      debugPrint('Warning details: $error');
    }
  }

  /// Log errors with optional stack trace
  static void error(String message, [Object? error, StackTrace? stackTrace, String? tag]) {
    final tagStr = tag != null ? '[$tag]' : '';
    debugPrint('$_prefix$tagStr ERROR: $message');
    if (error != null) {
      debugPrint('Error details: $error');
    }
    if (stackTrace != null) {
      debugPrint('Stack trace: $stackTrace');
    }
  }

  /// Log API calls (disabled in release mode)
  static void api(String method, String endpoint, [int? statusCode]) {
    if (kDebugMode) {
      final status = statusCode != null ? ' [$statusCode]' : '';
      debugPrint('$_prefix[API] $method $endpoint$status');
    }
  }

  /// Log timing information for performance monitoring
  static void timing(String operation, int milliseconds) {
    if (kDebugMode) {
      debugPrint('$_prefix[TIMING] $operation: ${milliseconds}ms');
    }
  }
}
