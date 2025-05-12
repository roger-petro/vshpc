# vsHPC README

## General User Information

This extension aims to help engineers launch jobs in HPC environments that use SLURM as a scheduler. The simulators to be used must be dynamically pre-loaded via a configuration file to avoid exposing private information. The configuration file can be loaded via the command palette or through the walkthrough.

An example of a configuration file is in the file vshpc.demo.json (available on github). Some information in this file must be changed according to your case. The simulators used are from the Reservoir area, but with some adjustments, other simulation engines can be employed. The file contains a series of tags to be replaced by the sprintf function before sending to the cluster. Check the submit.ts (github) source file to better understand the tags.

## Extension Usage

### Basic Configuration

You should set up SSH access to the cluster. A hostname may already have been loaded from a configuration file provided by your administrator.
However, this setting can be changed at any time in VS Code’s settings by filtering for the extension’s name.
