import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface Ticket {
  id: string;
  title: string;
  device: string;
  lastAction: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'resolved' | 'escalated';
  tier: number;
}

interface Article {
  id: string;
  title: string;
  category: string;
  views: number;
  helpful: number;
}

@Component({
  selector: 'app-helpdesk',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    FormsModule
  ],
  templateUrl: './helpdesk.html',
  styleUrls: ['./helpdesk.scss']
})
export class HelpDesk implements OnInit {
  searchQuery = '';
  isSearching = false;
  showResolutionScreen = false;
  showEscalationScreen = false;
  currentTicket: Ticket | null = null;
  chatMessage = '';
  selectedTier = 0; // Default to Tier 0 (Self Service)
  chatMessages: Array<{id: string, content: string, isUser: boolean, timestamp: Date}> = [
    { id: '1', content: 'Hi! How can I help you today?', isUser: false, timestamp: new Date() }
  ];

  // Top articles data
  topArticles: Article[] = [
    { id: '1', title: 'How to reset your password', category: 'Account Management', views: 1250, helpful: 95 },
    { id: '2', title: 'Connect to corporate VPN', category: 'Network', views: 980, helpful: 87 },
    { id: '3', title: 'Setup email on mobile', category: 'Email', views: 750, helpful: 92 },
    { id: '4', title: 'Troubleshoot printer issues', category: 'Hardware', views: 650, helpful: 78 },
    { id: '5', title: 'Access shared drives', category: 'File Management', views: 580, helpful: 85 }
  ];

  // Support tiers data
  supportTiers = [
    { 
      level: 0, 
      name: 'Self Service', 
      description: 'Knowledge base, FAQs, chatbot, guided tools' 
    },
    { 
      level: 1, 
      name: 'Basic Service', 
      description: 'Password resets, routine onboarding, simple troubleshooting' 
    },
    { 
      level: 2, 
      name: 'Intermediate Service', 
      description: 'Technical fixes, network issues, complex software' 
    },
    { 
      level: 3, 
      name: 'Advanced Service', 
      description: 'Specialist support, development teams, debugging' 
    },
    { 
      level: 4, 
      name: 'External Service', 
      description: 'Vendor support, escalation for unresolved issues' 
    }
  ];

  // Analytics data
  dailyChatUsage = 47;
  weeklyTrend = 23;
  resolutionRate = 87;
  weeklyData = [
    { day: 'Mon', count: 32, usage: 60 },
    { day: 'Tue', count: 28, usage: 52 },
    { day: 'Wed', count: 41, usage: 77 },
    { day: 'Thu', count: 35, usage: 66 },
    { day: 'Fri', count: 29, usage: 54 },
    { day: 'Sat', count: 18, usage: 34 },
    { day: 'Sun', count: 22, usage: 41 }
  ];

  // Tier 1 data
  selectedIssue: any = null;
  requestForm = {
    issueType: '',
    description: ''
  };

  commonIssues = [
    {
      title: "I can't log in",
      icon: "login",
      steps: [
        "Check if Caps Lock is on",
        "Try resetting your password",
        "Clear browser cache and cookies",
        "Try a different browser",
        "Contact IT support if still unable to log in"
      ]
    },
    {
      title: "My email isn't working",
      icon: "email",
      steps: [
        "Check your internet connection",
        "Verify email server settings",
        "Try sending a test email",
        "Check if email client is up to date",
        "Restart your email application"
      ]
    },
    {
      title: "I need software installed",
      icon: "download",
      steps: [
        "Check if software is already available",
        "Submit a software request form",
        "Wait for approval from IT",
        "Follow installation instructions",
        "Contact support if installation fails"
      ]
    },
    {
      title: "I can't access files",
      icon: "folder_shared",
      steps: [
        "Check if you have proper permissions",
        "Verify the file path is correct",
        "Try accessing from a different location",
        "Check if the file server is accessible",
        "Request access if needed"
      ]
    },
    {
      title: "My computer is slow",
      icon: "speed",
      steps: [
        "Restart your computer",
        "Close unnecessary programs",
        "Check available disk space",
        "Run a virus scan",
        "Contact IT for hardware issues"
      ]
    }
  ];

  // Quick actions
  quickActions = [
    { id: 'reset-password', title: 'Reset Password', icon: 'lock_reset', description: 'Reset your account password' },
    { id: 'routine-onboarding', title: 'Routine Onboarding', icon: 'person_add', description: 'Complete routine onboarding tasks' },
    { id: 'request-software', title: 'Request Software', icon: 'download', description: 'Request new software installation' },
    { id: 'track-ticket', title: 'Track Ticket', icon: 'track_changes', description: 'Check ticket status' },
    { id: 'network-help', title: 'Network Help', icon: 'wifi', description: 'Troubleshoot network issues' }
  ];

  // Navigation items
  navItems = [
    { id: 'home', title: 'Home', icon: 'home', active: true },
    { id: 'knowledge-base', title: 'Knowledge Base', icon: 'library_books' },
    { id: 'ai-assistant', title: 'AI Assistant', icon: 'smart_toy' },
    { id: 'self-service', title: 'Self-Service Tools', icon: 'build' },
    { id: 'my-tickets', title: 'My Tickets', icon: 'assignment' }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Initialize component
  }

  onSearch(): void {
    if (!this.searchQuery.trim()) return;
    
    this.isSearching = true;
    // Simulate search delay
    setTimeout(() => {
      this.isSearching = false;
      // Navigate to chat with search query
      this.router.navigate(['/chat'], { 
        queryParams: { q: this.searchQuery } 
      });
    }, 1000);
  }

  onChatSend(): void {
    if (!this.chatMessage.trim()) return;
    
    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      content: this.chatMessage,
      isUser: true,
      timestamp: new Date()
    };
    this.chatMessages.push(userMessage);
    
    // Simulate bot response
    setTimeout(() => {
      const botResponse = {
        id: (Date.now() + 1).toString(),
        content: this.generateBotResponse(this.chatMessage),
        isUser: false,
        timestamp: new Date()
      };
      this.chatMessages.push(botResponse);
    }, 1000);
    
    // Clear input
    this.chatMessage = '';
  }

  private generateBotResponse(userMessage: string): string {
    const responses = [
      "I understand you're having an issue. Let me help you with that.",
      "That's a common issue. Here are some steps to resolve it:",
      "I can help you with that. Let me provide some guidance.",
      "Based on your question, I recommend checking the following:",
      "I'll help you troubleshoot this step by step."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  onArticleClick(article: Article): void {
    // Navigate to article or open in modal
    console.log('Opening article:', article.title);
  }


  onStartChat(): void {
    this.router.navigate(['/chat']);
  }

  onGuidedTroubleshooting(): void {
    // Start guided troubleshooting flow
    console.log('Starting guided troubleshooting');
  }

  onBrowseArticles(): void {
    // Navigate to knowledge base
    console.log('Browsing articles');
  }

  onInteractiveWalkthroughs(): void {
    // Start interactive walkthroughs
    console.log('Starting interactive walkthroughs');
  }

  onPasswordReset(): void {
    this.showPasswordResetFlow();
  }

  onRequestSoftware(): void {
    this.showSoftwareRequestFlow();
  }

  onTrackTicket(): void {
    this.showTicketTracking();
  }

  onFeedback(helpful: boolean): void {
    // Send feedback to analytics
    console.log('Feedback received:', helpful);
    this.showResolutionScreen = false;
  }

  onTicketClick(event: Event): void {
    event.preventDefault();
    // Navigate to ticket details or open ticket in new tab
    console.log('Ticket PCTE334333 clicked');
    // In a real application, this would open the ticket details
    window.open('#', '_blank');
  }

  onSubmitTicket(): void {
    // Submit the auto-filled ticket
    console.log('Submitting ticket:', this.currentTicket);
    this.showEscalationScreen = false;
  }

  onEditTicket(): void {
    // Allow editing of ticket details
    console.log('Editing ticket:', this.currentTicket);
  }

  onNavItemClick(item: any): void {
    // Update active nav item
    this.navItems.forEach(nav => nav.active = false);
    item.active = true;

    switch (item.id) {
      case 'home':
        // Already on home
        break;
      case 'knowledge-base':
        this.onBrowseArticles();
        break;
      case 'ai-assistant':
        this.onStartChat();
        break;
      case 'self-service':
        // Show self-service tools
        break;
      case 'my-tickets':
        this.showTicketTracking();
        break;
    }
  }

  private showPasswordResetFlow(): void {
    // Simulate password reset flow
    console.log('Starting password reset flow');
    // This would typically open a modal or navigate to a specific flow
  }

  private showSoftwareRequestFlow(): void {
    // Simulate software request flow
    console.log('Starting software request flow');
  }

  private showTicketTracking(): void {
    // Show ticket tracking interface
    console.log('Showing ticket tracking');
  }

  private showNetworkTroubleshooting(): void {
    // Start network troubleshooting flow
    console.log('Starting network troubleshooting');
  }

  // Simulate successful resolution
  simulateResolution(): void {
    this.showResolutionScreen = true;
  }

  // Simulate escalation scenario
  simulateEscalation(): void {
    this.currentTicket = {
      id: 'TKT-001',
      title: 'Cannot connect to VPN',
      device: 'Windows 11',
      lastAction: 'Tried password reset',
      priority: 'high',
      status: 'open',
      tier: 1
    };
    this.showEscalationScreen = true;
  }

  onTierClick(tier: number): void {
    if (tier === 0) {
      // Self service - show knowledge base or guided tools
      console.log('Self service clicked');
    } else if (tier === 1) {
      // Get help - navigate to chat or create ticket
      this.router.navigate(['/chat']);
    }
  }

  onQuickAction(action: string): void {
    switch (action) {
      case 'password':
        this.showPasswordResetFlow();
        break;
      case 'ticket':
        this.simulateEscalation();
        break;
    }
  }

  onTierSelect(tier: number): void {
    this.selectedTier = tier;
  }

  getTierName(tier: number): string {
    const tierData = this.supportTiers.find(t => t.level === tier);
    return tierData ? tierData.name : 'Unknown Tier';
  }

  getTierDescription(tier: number): string {
    const tierData = this.supportTiers.find(t => t.level === tier);
    return tierData ? tierData.description : 'No description available';
  }

  onTierAction(tier: number): void {
    switch (tier) {
      case 1:
        // Basic Service - password resets, routine onboarding
        console.log('Basic Service requested');
        break;
      case 2:
        // Intermediate Service - technical fixes
        console.log('Intermediate Service requested');
        break;
      case 3:
        // Advanced Service - specialist support
        console.log('Advanced Service requested');
        break;
      case 4:
        // External Service - vendor support
        console.log('External Service requested');
        break;
    }
  }

  // Tier 1 methods
  onQuickActionClick(action: any): void {
    console.log('Quick action clicked:', action);
    // Handle different quick actions
    if (typeof action === 'string') {
      switch (action) {
        case 'password-reset':
          this.showPasswordResetFlow();
          break;
        case 'account-unlock':
          this.showAccountUnlockFlow();
          break;
        case 'email-setup':
          this.showEmailSetupFlow();
          break;
        case 'software-request':
          this.showSoftwareRequestFlow();
          break;
        case 'access-request':
          this.showAccessRequestFlow();
          break;
        case 'routine-onboarding':
          this.showRoutineOnboardingFlow();
          break;
      }
    } else if (action && action.id) {
      // Handle sidebar quick actions
      switch (action.id) {
        case 'reset-password':
          this.showPasswordResetFlow();
          break;
        case 'request-software':
          this.showSoftwareRequestFlow();
          break;
        case 'track-ticket':
          this.showTicketTracking();
          break;
        case 'network-help':
          this.showNetworkTroubleshooting();
          break;
      }
    }
  }

  onIssueSelect(issue: any): void {
    this.selectedIssue = issue;
  }

  onIssueResolved(): void {
    console.log('Issue resolved:', this.selectedIssue?.title);
    this.selectedIssue = null;
    // Show success message or redirect
  }

  onEscalateIssue(): void {
    console.log('Escalating issue:', this.selectedIssue?.title);
    this.selectedIssue = null;
    // Navigate to higher tier or create ticket
  }

  onSubmitRequest(): void {
    console.log('Submitting request:', this.requestForm);
    // Submit the support request
    this.onClearForm();
  }

  onClearForm(): void {
    this.requestForm = {
      issueType: '',
      description: ''
    };
  }

  private showAccountUnlockFlow(): void {
    console.log('Starting account unlock flow');
  }

  private showEmailSetupFlow(): void {
    console.log('Starting email setup flow');
  }

  private showAccessRequestFlow(): void {
    console.log('Starting access request flow');
  }

  private showRoutineOnboardingFlow(): void {
    console.log('Starting routine onboarding flow');
  }
}
