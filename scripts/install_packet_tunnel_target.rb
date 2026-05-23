#!/usr/bin/env ruby
# Adds a Packet Tunnel app extension target to an Expo prebuild Xcode project.

require 'xcodeproj'

project_path = Dir[File.join(__dir__, '..', 'ios', '*.xcodeproj')].first
abort('Run npx expo prebuild first: no ios/*.xcodeproj found') unless project_path

project = Xcodeproj::Project.open(project_path)
app_target = project.targets.find { |target| target.respond_to?(:product_type) && target.product_type == 'com.apple.product-type.application' }
abort('No iOS application target found') unless app_target

extension_name = 'PacketTunnel'
extension_target = project.targets.find { |target| target.name == extension_name }
extension_target ||= project.new_target(:app_extension, extension_name, :ios, '16.0')

if extension_target.product_reference
  extension_target.product_reference.path = "#{extension_name}.appex"
  extension_target.product_reference.name = "#{extension_name}.appex"
  extension_target.product_reference.explicit_file_type = 'wrapper.app-extension'
end

extension_group = project.main_group.find_subpath('PacketTunnel', true)
extension_group.set_source_tree('<group>')

source_files = %w[
  PacketTunnel/PacketTunnelProvider.swift
  PacketTunnel/SingBoxEngine.swift
]

source_files.each do |relative_path|
  file_name = File.basename(relative_path)
  file_refs = (extension_group.files + project.files).select { |file| file.path == relative_path || file.path == file_name || file.display_name == file_name }.uniq
  file_ref = file_refs.find { |file| extension_target.source_build_phase.files_references.include?(file) } || file_refs.first
  (file_refs - [file_ref]).each { |file| file.remove_from_project unless extension_target.source_build_phase.files_references.include?(file) }
  file_ref ||= extension_group.new_file(relative_path)
  extension_group.children << file_ref unless extension_group.children.include?(file_ref)
  extension_target.add_file_references([file_ref]) unless extension_target.source_build_phase.files_references.include?(file_ref)
end

extension_target.build_configurations.each do |config|
  settings = config.build_settings
  settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.pulsevpn.app.PacketTunnel'
  settings['PRODUCT_NAME'] = extension_name
  settings['PRODUCT_MODULE_NAME'] = extension_name
  settings['WRAPPER_EXTENSION'] = 'appex'
  settings['CURRENT_PROJECT_VERSION'] = '1'
  settings['MARKETING_VERSION'] = '0.1.0'
  settings['INFOPLIST_FILE'] = 'PacketTunnel/Info.plist'
  settings['CODE_SIGN_ENTITLEMENTS'] = 'PacketTunnel/PacketTunnel.entitlements'
  settings['SWIFT_VERSION'] = '5.0'
  settings['IPHONEOS_DEPLOYMENT_TARGET'] = '16.0'
  settings['SKIP_INSTALL'] = 'YES'
end

copy_phase = app_target.copy_files_build_phases.find { |phase| phase.name == 'Embed App Extensions' }
copy_phase ||= app_target.new_copy_files_build_phase('Embed App Extensions')
copy_phase.dst_subfolder_spec = '13'
copy_phase.add_file_reference(extension_target.product_reference, true) if extension_target.product_reference

app_target.build_configurations.each do |config|
  config.build_settings['CODE_SIGN_ENTITLEMENTS'] ||= "#{app_target.name}/#{app_target.name}.entitlements"
end

project.save
puts "PacketTunnel target is installed in #{project_path}"
