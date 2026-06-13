interface PageWrapProps {
	title?: React.ReactNode
	sub?: React.ReactNode
	action?: React.ReactNode
	children: React.ReactNode
}

export function PageWrap({ title, sub, action, children }: PageWrapProps) {
	return (
		<div className='page-pad' style={{ padding: '28px 24px' }}>
			{(title || action) && (
				<div
					className='action-row'
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'flex-start',
						flexWrap: 'wrap',
						gap: 12,
						marginBottom: 26,
					}}
				>
					<div>
						{title && (
							<div
								style={{
									fontSize: 22,
									fontWeight: 900,
									letterSpacing: -0.4,
									marginBottom: 4,
								}}
							>
								{title}
							</div>
						)}
						{sub && (
							<div style={{ color: 'var(--app-muted)', fontSize: 13 }}>
								{sub}
							</div>
						)}
					</div>
					{action && <div>{action}</div>}
				</div>
			)}
			{children}
		</div>
	)
}
