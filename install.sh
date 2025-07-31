#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;90m'
NC='\033[0m'

CHECKMARK="✓"
CROSS="✗"
ARROW="→"
STAR="★"
GEAR=""
ROCKET="🚀"

TERM_WIDTH=$(tput cols 2>/dev/null || echo 80)


# Status functions
print_status() {
  echo -e "${GREEN}${CHECKMARK} ${WHITE}[INFO]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW} ${WHITE}[WARNING]${NC} $1"
}

print_error() {
  echo -e "${RED}${CROSS} ${WHITE}[ERROR]${NC} $1"
}

print_step() {
  echo -e "${BLUE}${ARROW} ${WHITE}[STEP]${NC} $1"
}

print_success() {
  echo -e "${GREEN}${CHECKMARK} ${WHITE}[SUCCESS]${NC} $1"
}

# Animated spinner
spin() {
  local pid=$1
  local delay=0.1
  local spinstr='|/-\'
  echo -n " "
  while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
    local temp=${spinstr#?}
    printf " [${CYAN}%c${NC}]  " "$spinstr"
    local spinstr=$temp${spinstr%"$temp"}
    sleep $delay
    printf "\b\b\b\b\b\b"
  done
  printf "    \b\b\b\b"
}

# Box drawing function
draw_box() {
  local text="$1"
  local color="$2"
  local length=${#text}
  local box_width=$((length + 4))

  echo -e "${color}┌$(printf "%*s" $((box_width - 2)) | tr ' ' '─')┐${NC}"
  echo -e "${color}│${NC} $text ${color}│${NC}"
  echo -e "${color}└$(printf "%*s" $((box_width - 2)) | tr ' ' '─')┘${NC}"
}

function detect_shell() {
  if [ -n "$ZSH_VERSION" ]; then
    echo "zsh"
  elif [ -n "$BASH_VERSION" ]; then
    echo "bash"
  elif [ -n "$SHELL" ]; then
    basename "$SHELL"
  else
    ps -p $$ -o comm= | sed 's/^-//'
  fi
}

function add_to_path() {
  local shell_type=$(detect_shell)
  local rc_file=""

  print_step "Detecting shell environment..."
  sleep 0.5
  print_status "Detected shell: ${CYAN}$shell_type${NC}"

  case "$shell_type" in
  "bash")
    rc_file="$HOME/.bashrc"
    ;;
  "zsh")
    rc_file="$HOME/.zshrc"
    ;;
  *)
    print_error "Unsupported shell: $shell_type"
    print_warning "Please manually add '${CYAN}$HOME/.local/bin${NC}' to your PATH"
    return 1
    ;;
  esac

  print_step "Checking PATH configuration..."
  sleep 0.3

  if grep -q "$HOME/.local/bin" "$rc_file" 2>/dev/null; then
    print_warning "PATH already contains ${CYAN}$HOME/.local/bin${NC}"
    return 0
  fi

  print_step "Updating PATH in ${CYAN}$rc_file${NC}..."
  sleep 0.5

  echo "" >>"$rc_file"
  echo "# Added by aicommit installer" >>"$rc_file"
  echo "export PATH=\"\$HOME/.local/bin:\$PATH\"" >>"$rc_file"

  print_success "PATH modification added to ${CYAN}$rc_file${NC}"
  print_warning "Please restart your terminal or run '${CYAN}source $rc_file${NC}' to apply changes"
}

function check_folder() {
  print_step "Checking installation directory..."
  sleep 0.3

  if [ ! -d "$HOME/.local/bin" ]; then
    print_status "Creating ${CYAN}$HOME/.local/bin${NC} directory"
    mkdir -p "$HOME/.local/bin" &
    local pid=$!
    spin $pid
    wait $pid
    print_success "Directory created successfully"
  else
    print_status "Directory ${CYAN}$HOME/.local/bin${NC} already exists"
  fi
}

function install_script() {
  print_step "Locating aicommit script..."
  sleep 0.3

  if [ ! -f "aicommit" ]; then
    print_error "aicommit script not found in current directory"
    echo -e "${GRAY}Expected location: $(pwd)/aicommit${NC}"
    exit 1
  fi

  print_success "Found aicommit script"

  print_step "Installing aicommit script..."
  sleep 0.3

  if cp aicommit "$HOME/.local/bin/" 2>/dev/null; then
    print_success "Script copied successfully"
  else
    print_error "Failed to copy aicommit script"
    exit 1
  fi

  print_step "Making script executable..."
  sleep 0.2

  if chmod +x "$HOME/.local/bin/aicommit" 2>/dev/null; then
    print_success "Script permissions updated"
  else
    print_error "Failed to make script executable"
    exit 1
  fi
}

function verify_installation() {
  print_step "Verifying installation..."
  sleep 0.5

  if [ -x "$HOME/.local/bin/aicommit" ]; then
    print_success "Installation verified successfully"
    return 0
  else
    print_error "Installation verification failed"
    return 1
  fi
}

function show_completion_banner() {
  echo
  echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║${NC}                 ${ROCKET} INSTALLATION COMPLETE! ${ROCKET}                   ${GREEN}║${NC}"
  echo -e "${GREEN}╠════════════════════════════════════════════════════════════════╣${NC}"
  echo -e "${GREEN}║${NC}  ${WHITE}aicommit${NC} has been successfully installed and configured!      ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}                                                                ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}  ${CYAN}Usage:${NC} Simply run '${WHITE}aicommit${NC}' from any directory               ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}  ${CYAN}Location:${NC} ${GRAY}$HOME/.local/bin/aicommit${NC}                 ${GREEN}║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo
}

function show_next_steps() {
  echo -e "${YELLOW}NEXT STEPS:${NC}"
  echo -e "${GRAY}├─${NC} Restart your terminal ${GRAY}OR${NC}"
  echo -e "${GRAY}├─${NC} Run: ${CYAN}source ~/.$(basename $SHELL)rc${NC}"
  echo -e "${GRAY}└─${NC} Test with: ${CYAN}aicommit --help${NC}"
  echo
}

# Main execution
clear

echo -e "${GRAY}This installer will set up aicommit on your system${NC}"
echo -e "${GRAY}Installation path: ${CYAN}$HOME/.local/bin${NC}"
echo

# Step 1: Check folder
check_folder
echo

# Step 2: Install script
install_script
echo

# Step 3: Add to PATH
add_to_path
echo

# Step 4: Verify installation
echo

if verify_installation; then
  echo
  show_completion_banner
  show_next_steps

  echo -e "${GREEN}${CHECKMARK} Installation completed successfully!${NC}"
  echo -e "${GRAY}Thank you for using aicommit installer${NC}"
else
  echo
  draw_box "INSTALLATION FAILED" "$RED"
  echo -e "${RED}${CROSS} Installation failed! Please check the errors above.${NC}"
  exit 1
fi
